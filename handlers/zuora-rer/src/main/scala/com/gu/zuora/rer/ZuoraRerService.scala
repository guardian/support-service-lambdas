package com.gu.zuora.rer

import com.gu.util.resthttp.RestRequestMaker.{PutRequest, RelativePath, Requests}
import com.gu.util.resthttp.Types.{ClientFailableOp, ClientFailure, GenericError}
import com.gu.util.zuora.ZuoraQuery.ZuoraQuerier
import com.gu.util.zuora.SafeQueryBuilder.Implicits._
import com.typesafe.scalalogging.LazyLogging
import play.api.libs.json.{JsValue, Json, Reads}

// For Zuora response deserialisation
case class ZuoraContact(AccountId: String, WorkEmail: String)
case class AccountContact(Id: String, WorkEmail: Option[String])
case class AccountBasicInfo(id: String, accountNumber: String, status: String)
case class AccountMetrics(balance: BigDecimal, creditBalance: BigDecimal, totalInvoiceBalance: BigDecimal)
case class AccountContactId(id: String)
case class CustomerAccount(
    basicInfo: AccountBasicInfo,
    metrics: AccountMetrics,
    billToContact: AccountContactId,
    soldToContact: AccountContactId,
)
case class BillingDeletionResult(id: String, status: String, success: Boolean)
case class ZuoraSubscription(id: String, status: String)

trait ZuoraRerError
case class ZuoraClientError(message: String) extends ZuoraRerError
case class PreconditionCheckError(message: String) extends ZuoraRerError

trait ZuoraRer {
  def zuoraContactsWithEmail(emailAddress: String): ClientFailableOp[List[ZuoraContact]]
  def verifyErasure(contact: ZuoraContact): Either[ZuoraRerError, Unit]
  def scrubAccount(contact: ZuoraContact): Either[ZuoraRerError, Unit]
}

case class ZuoraRerService(zuoraClient: Requests, zuoraQuerier: ZuoraQuerier) extends ZuoraRer with LazyLogging {

  implicit val readsC: Reads[ZuoraContact] = Json.reads[ZuoraContact]

  override def zuoraContactsWithEmail(emailAddress: String): ClientFailableOp[List[ZuoraContact]] = {
    for {
      contactQuery <- zoql"SELECT AccountId, WorkEmail FROM Contact where WorkEmail=$emailAddress"
      queryResult <- zuoraQuerier[ZuoraContact](contactQuery).map(_.records)
    } yield queryResult
  }

  implicit val readsAccountContact: Reads[AccountContact] = Json.reads[AccountContact]

  private def accountContacts(accountId: String): Either[ClientFailure, List[AccountContact]] = {
    val result = for {
      contactQuery <- zoql"SELECT Id, WorkEmail FROM Contact where AccountId=$accountId"
      queryResult <- zuoraQuerier[AccountContact](contactQuery).map(_.records)
    } yield queryResult
    result.toDisjunction
  }

  private def accountSubscriptions(accountId: String): Either[ClientFailure, JsValue] =
    zuoraClient.get[JsValue](s"subscriptions/accounts/$accountId?page=1&pageSize=10000").toDisjunction

  private def retrieveAccount(accountId: String): Either[ClientFailure, JsValue] =
    zuoraClient.get[JsValue](s"accounts/$accountId").toDisjunction

  private def accountPaymentMethods(accountId: String): Either[ClientFailure, JsValue] =
    zuoraClient.get[JsValue](s"accounts/$accountId/payment-methods").toDisjunction

  private def scrubAccountObject(account: CustomerAccount): Either[ClientFailure, JsValue] = {
    val newName = account.basicInfo.accountNumber
    val putReq = PutRequest(
      Json.obj(
        "name" -> newName,
        "crmId" -> "",
        "sfContactId__c" -> "",
        "IdentityId__c" -> "",
        "autoPay" -> false,
        "invoiceDeliveryPrefsEmail" -> false,
        "invoiceDeliveryPrefsPrint" -> false,
      ),
      RelativePath(s"accounts/${account.basicInfo.id}"),
    )
    zuoraClient.put[JsValue](putReq).toDisjunction.map(_.bodyAsJson)
  }

  private def ensureAccountIsActive(account: CustomerAccount): Either[ClientFailure, Unit] = {
    // ensure account is Active (not cancelled)
    // because account updates will fail if not Active
    if (account.basicInfo.status != "Active") {
      // Use old CRUD update to re-activate
      //  https://www.zuora.com/developer/api-references/older-api/operation/Object_PUTAccount/#!path=Status&t=request
      //  Include contact IDs in the BillToId and SoldToId fields when you change the Status field value to Active.
      val putReq = PutRequest(
        Json.obj(
          "Status" -> "Active",
          "BillToId" -> account.billToContact.id,
          "SoldToId" -> account.soldToContact.id,
        ),
        RelativePath(s"object/account/${account.basicInfo.id}"),
      )
      zuoraClient.put[JsValue](putReq).toDisjunction.map(_ => ())
    } else {
      Right(())
    }
  }

  private def scrubPaymentMethods(paymentMethodIds: Set[String]): Either[ClientFailure, Unit] = {
    val initialValue: Either[ClientFailure, Unit] = Right(())
    paymentMethodIds.foldLeft(initialValue) { (lastResult, paymentMethodId) =>
      if (lastResult.isRight) {
        val putReq = PutRequest(Json.obj(), RelativePath(s"payment-methods/$paymentMethodId/scrub"))
        zuoraClient.put[JsValue](putReq).toDisjunction.map(_ => ())
      } else // fail on first error
        lastResult
    }
  }

  private def scrubContacts(contactIds: Set[String]): Either[ClientFailure, Unit] = {
    val initialValue: Either[ClientFailure, Unit] = Right(())
    contactIds.foldLeft(initialValue) { (lastResult, contactId) =>
      if (lastResult.isRight) {
        val putReq = PutRequest(
          // N.B. leave Country and State unchanged as both are needed for tax assignment
          Json.obj(
            "Address1" -> "",
            "Address2" -> "",
            "City" -> "",
            "County" -> "",
            "Description" -> "",
            "Fax" -> "",
            "FirstName" -> ".",
            "HomePhone" -> "",
            "LastName" -> ".",
            "MobilePhone" -> "",
            "NickName" -> "",
            "OtherPhone" -> "",
            "OtherPhoneType" -> "Other",
            "PersonalEmail" -> "",
            "PostalCode" -> "",
            "SpecialDeliveryInstructions__c" -> "",
            "TaxRegion" -> "",
            "Title__c" -> "Other",
            "WorkEmail" -> "",
            "WorkPhone" -> "",
          ),
          RelativePath(s"object/contact/$contactId"),
        )
        zuoraClient.put[JsValue](putReq).toDisjunction.map(_ => ())
      } else // fail on first error
        lastResult
    }
  }

  implicit val readBillingDeletionResult: Reads[BillingDeletionResult] = Json.reads[BillingDeletionResult]

  private def deleteBillingDocuments(accountId: String): Either[ClientFailure, BillingDeletionResult] = {
    val jsn = Json.obj(
      "accountIds" -> List(accountId),
    )
    val outcome = for {
      result <- zuoraClient
        .post[JsValue, BillingDeletionResult](jsn, "accounts/billing-documents/files/deletion-jobs")
        .toDisjunction
      jobId = result.id
      jobStatus <- checkBillingDeletionSuccess(jobId)
    } yield jobStatus

    outcome match {
      case Right(BillingDeletionResult(_, "Pending", _)) | Right(BillingDeletionResult(_, "Processing", _)) | Right(
            BillingDeletionResult(_, "Error", _),
          ) =>
        Left(GenericError("Billing Deletion processing issue"))

      case _ => outcome
    }
  }

  private def checkBillingDeletionSuccess(
      jobId: String,
      counter: Int = 0,
  ): Either[ClientFailure, BillingDeletionResult] = {
    val sleepMs = 5000L
    val maxTries = 12
    val jobStatus =
      zuoraClient.get[BillingDeletionResult](s"accounts/billing-documents/files/deletion-jobs/$jobId").toDisjunction
    logger.info(s"$jobStatus job deletion")
    jobStatus match {
      case Right(BillingDeletionResult(_, "Pending", _)) | Right(BillingDeletionResult(_, "Processing", _))
          if counter < maxTries =>
        Thread.sleep(sleepMs)
        checkBillingDeletionSuccess(jobId, counter + 1)

      case _ => jobStatus
    }
  }

  def checkSubscriptionStatus(statuses: Set[String]): Either[ZuoraRerError, Unit] = {
    val invalidStatuses = statuses diff Set("Cancelled", "Expired")
    if (invalidStatuses == Set())
      Right(())
    else
      Left(PreconditionCheckError("Subscription contains a non-erasable status: " + invalidStatuses.mkString(",")))
  }

  def checkAccountBalances(customer: CustomerAccount): Either[ZuoraRerError, Unit] = {
    if (
      customer.metrics.balance == 0.0 && customer.metrics.creditBalance == 0.0 && customer.metrics.totalInvoiceBalance == 0.0
    )
      Right(())
    else
      Left(PreconditionCheckError("Account balances are not zero"))
  }

  def toZuoraClientError(err: ClientFailure) = ZuoraClientError(err.message)

  implicit val readsAccountBasicInfo: Reads[AccountBasicInfo] = Json.reads[AccountBasicInfo]
  implicit val readsAccountMetrics: Reads[AccountMetrics] = Json.reads[AccountMetrics]
  implicit val readsAccountContactId: Reads[AccountContactId] = Json.reads[AccountContactId]
  implicit val readsAccount: Reads[CustomerAccount] = Json.reads[CustomerAccount]
  implicit val readsSub: Reads[ZuoraSubscription] = Json.reads[ZuoraSubscription]

  override def verifyErasure(contact: ZuoraContact): Either[ZuoraRerError, Unit] = {
    logger.info("Checking that subscription cancelled and payment state balanced for contact.")
    for {
      subscriptions <- accountSubscriptions(contact.AccountId).left.map(toZuoraClientError)
      subscriptionStatuses = (subscriptions \ "subscriptions").as[List[ZuoraSubscription]].map(_.status).toSet
      _ <- checkSubscriptionStatus(subscriptionStatuses)
      accountJs <- retrieveAccount(contact.AccountId).left.map(toZuoraClientError)
      _ <- checkAccountBalances(accountJs.as[CustomerAccount])
    } yield ()
  }

  override def scrubAccount(contact: ZuoraContact): Either[ZuoraRerError, Unit] = {
    logger.info("Updating account to remove personal data for contact.")
    val scrubOperations = for {
      accountJs <- retrieveAccount(contact.AccountId)
      account = accountJs.as[CustomerAccount]
      accountNumber = account.basicInfo.accountNumber
      _ = logger.debug(s"retrieveAccount: $accountJs")
      _ = logger.debug(s"account number = $accountNumber")
      _ = logger.info(s"scrubbing account object")
      _ <- ensureAccountIsActive(account)
      _ <- scrubAccountObject(account)

      paymentMethods <- accountPaymentMethods(contact.AccountId)
      paymentMethodIds = (paymentMethods \\ "id").map(jsId => jsId.as[String]).toSet
      _ = logger.debug(s"paymentMethods: $paymentMethods")
      _ = logger.debug(s"paymentMethod id's: ${paymentMethods \\ "id"}")
      _ = logger.info("scrubbing payment methods")
      _ <- scrubPaymentMethods(paymentMethodIds)

      accountContacts <- accountContacts(contact.AccountId)
      _ = logger.debug(s"account contacts: $accountContacts")
      (mainContacts, otherContacts) = accountContacts.partition(_.WorkEmail contains contact.WorkEmail)
      _ = logger.info("scrubbing non-main contacts")
      _ <- scrubContacts(otherContacts.map(_.Id).toSet)

      _ = logger.info("deleting the billing documents")
      _ <- deleteBillingDocuments(contact.AccountId)

      // The main contact is scrubbed last, so that any failing operations,
      // when retried, will still be able to locate the account by email address
      _ = logger.info("scrubbing main contact")
      _ <- scrubContacts(mainContacts.map(_.Id).toSet)

    } yield ()
    scrubOperations.left.map(toZuoraClientError)
  }

}
