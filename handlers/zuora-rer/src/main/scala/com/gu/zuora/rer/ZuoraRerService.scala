package com.gu.zuora.rer

import com.gu.util.resthttp.RestRequestMaker.{DownloadStream, PostRequest, PutRequest, RelativePath, Requests, WithoutCheck}
import com.gu.util.resthttp.Types.{ClientFailableOp, ClientFailure, GenericError}
import com.gu.util.zuora.ZuoraQuery.ZuoraQuerier
import com.gu.util.zuora.SafeQueryBuilder.Implicits._
import com.typesafe.scalalogging.LazyLogging
import play.api.libs.json.{JsValue, Json, Reads}
import cats.syntax.traverse._

// For Zuora response deserialisation
case class ZuoraContact(AccountId: String, WorkEmail: String)
case class AccountNumber(AccountNumber: String)
case class AccountContact(Id: String, WorkEmail: Option[String])
case class AccountBasicInfo(accountNumber: String)
case class AccountMetrics(balance: BigDecimal, creditBalance: BigDecimal, totalInvoiceBalance: BigDecimal)
case class CustomerAccount(basicInfo: AccountBasicInfo, metrics: AccountMetrics)
case class InvoiceId(id: String)
case class InvoiceIds(invoices: List[InvoiceId])
case class InvoicePdfUrl(pdfFileUrl: String)
case class InvoiceFiles(invoiceFiles: List[InvoicePdfUrl])
case class BillingDeletionResult(id: String, status: String, success: Boolean)
case class ZuoraAccountSuccess(accountSummary: JsValue, accountObj: JsValue, invoiceList: InvoiceIds)

trait ZuoraRerError
case class ZuoraClientError(message: String) extends ZuoraRerError
case class JsonDeserialisationError(message: String) extends ZuoraRerError

trait ZuoraRer {
  def zuoraContactsWithEmail(emailAddress: String): ClientFailableOp[List[ZuoraContact]]
//  def accountResponse(contact: ZuoraContact): Either[ZuoraRerError, ZuoraAccountSuccess]
//  def invoicesResponse(accountInvoices: List[InvoiceId]): Either[ZuoraRerError, List[DownloadStream]]
  def scrubAccount(contact: ZuoraContact): Either[ZuoraRerError, Unit]
  def verifyErasure(contact: ZuoraContact): Either[ZuoraRerError, Unit]
}

case class ZuoraRerService(zuoraClient: Requests, zuoraDownloadClient: Requests, zuoraQuerier: ZuoraQuerier) extends ZuoraRer with LazyLogging {

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

  private def accountSummary(accountId: String): Either[ClientFailure, JsValue] =
    zuoraClient.get[JsValue](s"accounts/$accountId/summary").toDisjunction

  implicit val readsOb: Reads[AccountNumber] = Json.reads[AccountNumber]

  private def accountSubscriptions(accountId: String): Either[ClientFailure, JsValue] =
    zuoraClient.get[JsValue](s"subscriptions/accounts/$accountId?page=1&page=10000").toDisjunction

  private def accountObj(accountId: String): Either[ClientFailure, JsValue] =
    zuoraClient.get[JsValue](s"accounts/$accountId").toDisjunction

  private def accountPaymentMethods(accountId: String): Either[ClientFailure, JsValue] =
    zuoraClient.get[JsValue](s"accounts/$accountId/payment-methods").toDisjunction

  // TODO: move to using the newer API (Accounts CRUD:update an account is deprecated.
  private def scrubAccountObject(accountId: String, newName: String): Either[ClientFailure, JsValue] = {
    val putReq = PutRequest(
      Json.obj(
        "Name" -> newName,
        "CrmId" -> "",
        "sfContactId__c" -> "",
        "IdentityId__c" -> "",
        "AutoPay" -> false
      ),
      RelativePath(s"object/account/$accountId?rejectUnknownFields=true")
    )
    zuoraClient.put[JsValue](putReq).toDisjunction.map(_.bodyAsJson)
  }

  private def scrubPaymentMethods(paymentMethodIds: Set[String]): Either[ClientFailure, Unit] = {
    paymentMethodIds.foldLeft(Right(()): Either[ClientFailure, Unit]) {
      (lastResult, paymentMethodId) =>
        if (lastResult.isRight) {
          val putReq = PutRequest(Json.obj(), RelativePath(s"payment-methods/$paymentMethodId/scrub"))
          zuoraClient.put[JsValue](putReq).toDisjunction.map(_ => ())
        }
        else // fail on first error
          lastResult
    }
  }

  private def scrubContacts(contactIds: Set[String]): Either[ClientFailure, Unit] = {
    contactIds.foldLeft(Right(()): Either[ClientFailure, Unit]) {
      (lastResult, contactId) =>
        if (lastResult.isRight) {
          val putReq = PutRequest(Json.obj(), RelativePath(s"contacts/$contactId/scrub"))
          zuoraClient.put[JsValue](putReq).toDisjunction.map(_ => ())
        }
        else // fail on first error
          lastResult
    }
  }

  implicit val readBillingDeletionResult: Reads[BillingDeletionResult] = Json.reads[BillingDeletionResult]

  private def deleteBillingDocuments(accountIds: String): Either[ClientFailure, BillingDeletionResult] = {
    val jsn = Json.obj(
      "accountIds" -> List(accountIds)
    )
    zuoraClient.post[JsValue, BillingDeletionResult](jsn, "accounts/billing-documents/files/deletion-jobs").toDisjunction
  }

  implicit val readsPdfUrls: Reads[InvoicePdfUrl] = Json.reads[InvoicePdfUrl]
  implicit val readInvoiceFiles: Reads[InvoiceFiles] = Json.reads[InvoiceFiles]

  private def getInvoiceFiles(invoiceId: String): Either[ClientFailure, InvoiceFiles] =
    zuoraClient.get[InvoiceFiles](s"invoices/$invoiceId/files").toDisjunction

  private def invoiceFileContents(pdfUrls: List[InvoicePdfUrl]): Either[ClientFailure, List[DownloadStream]] = {
    pdfUrls.traverse(pdfUrl => {
      /* The pdf url provided in the invoice only sometimes includes a content-length header. Content-length
       * is required to upload to S3. For this reason, we're using the 'batch-query' endpoint and a zuoraDownloadClient instead.
       */
      val fileIdUrl = pdfUrl.pdfFileUrl.replace("/v1/files/", "batch-query/file/")
      zuoraDownloadClient.getDownloadStream(fileIdUrl).toDisjunction
    })
  }

  implicit val readsIIds: Reads[InvoiceId] = Json.reads[InvoiceId]
  implicit val readsIn: Reads[InvoiceIds] = Json.reads[InvoiceIds]

//  override def accountResponse(contact: ZuoraContact): Either[ZuoraRerError, ZuoraAccountSuccess] = {
//    logger.info("Retrieving account summary and account object for contact.")
//    for {
//      accountSummary <- accountSummary(contact.AccountId).left.map(err => ZuoraClientError(err.message))
//      accountObj <- accountObj(contact.AccountId).left.map(err => ZuoraClientError(err.message))
//      invoices <- Json.fromJson[InvoiceIds](accountSummary).asEither.left.map(err => JsonDeserialisationError(err.toString()))
//      zuoraRerResponse = ZuoraAccountSuccess(accountSummary, accountObj, invoices)
//    } yield zuoraRerResponse
//  }

//  override def invoicesResponse(accountInvoices: List[InvoiceId]): Either[ZuoraRerError, List[DownloadStream]] = {
//    logger.info("Retrieving invoices for contact.")
//    accountInvoices.flatTraverse { invoice =>
//      for {
//        invoices <- getInvoiceFiles(invoice.id).left.map(err => ZuoraClientError(err.message))
//        invoiceDownloadStreams <- invoiceFileContents(invoices.invoiceFiles).left.map(err => ZuoraClientError(err.message))
//      } yield {
//        invoiceDownloadStreams
//      }
//    }
//  }

  def checkSubscriptionStatus(statuses: Set[String]) : Either[ClientFailure, Unit] = {
    val invalidStatuses = statuses diff Set("Cancelled", "Expired")
    if (invalidStatuses == Set())
      Right(())
    else
      Left(GenericError("Subscription contains a non-erasable status: " + invalidStatuses.mkString(",")))
  }

  def checkAccountBalances(customer: CustomerAccount): Either[ClientFailure, Unit] = {
    if(customer.metrics.balance == 0.0 && customer.metrics.creditBalance == 0.0 && customer.metrics.totalInvoiceBalance == 0.0)
      Right(())
    else
      Left(GenericError("Account balances are not zero"))
  }

  implicit val readsAccountBasicInfo: Reads[AccountBasicInfo] = Json.reads[AccountBasicInfo]
  implicit val readsAccountMetrics: Reads[AccountMetrics] = Json.reads[AccountMetrics]
  implicit val readsAccount: Reads[CustomerAccount] = Json.reads[CustomerAccount]

  override def verifyErasure(contact: ZuoraContact): Either[ZuoraRerError, Unit] = {
    logger.info("Checking that subscription cancelled and payment state balanced for contact.")
    val verifyOperations = for {
      subscriptions <- accountSubscriptions(contact.AccountId)
      subscriptionStatuses = (subscriptions \\ "status").map(jsStatus => jsStatus.as[String]).toSet
      _ <- checkSubscriptionStatus(subscriptionStatuses)
      accountObj <- accountObj(contact.AccountId)
      _ <- checkAccountBalances(accountObj.as[CustomerAccount])
    } yield()
    verifyOperations.left.map(err => ZuoraClientError(err.message))
  }

  override def scrubAccount(contact: ZuoraContact): Either[ZuoraRerError, Unit] = {
    logger.info("Updating account to remove personal data for contact.")
    val scrubOperations = for {
      accountObj <- accountObj(contact.AccountId)
      accountNumber = accountObj.as[CustomerAccount].basicInfo.accountNumber
      _ = logger.debug(s"accountObj: $accountObj")
      _ = logger.debug(s"account number = $accountNumber")
      _ = logger.info(s"scrubbing account object")
      _ <- scrubAccountObject(contact.AccountId, accountNumber)

      paymentMethods <- accountPaymentMethods(contact.AccountId)
      paymentMethodIds = (paymentMethods \\ "id").map(jsId => jsId.as[String]).toSet
      _ = logger.debug(s"paymentMethods: $paymentMethods")
      _ = logger.debug(s"paymentMethod id's: ${paymentMethods \\ "id"}")
      _ = logger.info("scrubbing payment methods")
      _ <- scrubPaymentMethods(paymentMethodIds)

      accountContacts <- accountContacts(contact.AccountId)
      _ = logger.debug(s"account contacts: $accountContacts")
      mainContactId = accountContacts.filter(_.WorkEmail contains contact.WorkEmail).head.Id
      otherContactIds = accountContacts.collect{
        case(contact) if contact.Id != mainContactId => contact.Id
      }.toSet
      _ = logger.info("scrubbing non-main contacts")
      _ <- scrubContacts(otherContactIds)

      // TODO: Delete Billing documents and wait for result
      //_ <- deleteBillingDocuments()

      // TODO: scrub main contact
//      _ <- scrubContacts(Set(mainContactId))

    } yield ()
    scrubOperations.left.map(err => ZuoraClientError(err.message))
  }

}
