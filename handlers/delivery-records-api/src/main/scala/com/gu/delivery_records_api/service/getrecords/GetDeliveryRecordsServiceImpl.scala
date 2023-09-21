package com.gu.delivery_records_api.service.getrecords

import cats.Monad
import cats.data.EitherT
import cats.syntax.all._
import com.gu.delivery_records_api.service.createproblem.{SFApiContactPhoneNumbers, SFApiDeliveryRecord}
import com.gu.delivery_records_api.service.{DeliveryRecordServiceError, DeliveryRecordServiceGenericError, DeliveryRecordServiceSubscriptionNotFound, getrecords}
import com.gu.salesforce.SalesforceQueryConstants.{contactToWhereClausePart, escapeString}
import com.gu.salesforce.sttp.SalesforceClient
import com.gu.salesforce.{Contact, RecordsWrapperCaseClass}
import io.circe.generic.auto._

import java.time.LocalDate
import scala.annotation.tailrec

class GetDeliveryRecordsServiceImpl[F[_]: Monad](salesforceClient: SalesforceClient[F]) extends GetDeliveryRecordsService[F] {

  import GetDeliveryRecordsServiceImpl._

  override def getDeliveryRecordsForSubscription(
    subscriptionId: String,
    contact: Contact,
    optionalStartDate: Option[LocalDate],
    optionalEndDate: Option[LocalDate],
    optionalCancellationEffectiveDate: Option[LocalDate],
  ): EitherT[F, DeliveryRecordServiceError, DeliveryRecordsApiResponse] =
    for {
      queryResult <- salesforceClient.query[SubscriptionRecordQueryResult](
          deliveryRecordsQuery(
            contact,
            subscriptionId,
            optionalStartDate,
            optionalEndDate,
            optionalCancellationEffectiveDate,
          ),
        )
        .leftMap(error => DeliveryRecordServiceGenericError(error.toString))
      records <- getDeliveryRecordsFromQueryResults(subscriptionId, contact, queryResult).toEitherT[F]
      contactPhoneNumbers = queryResult.records.head.Buyer__r.filterOutGarbage()
      results = records.reverse.foldLeft(List.empty[DeliveryRecord])(transformSfApiDeliveryRecords)
      deliveryProblemMap = records
        .flatMap(
          _.Case__r.map(problemCase =>
            problemCase.Id -> DeliveryProblemCase(
              id = problemCase.Id,
              ref = problemCase.CaseNumber,
              subject = problemCase.Subject,
              description = problemCase.Description,
              problemType = problemCase.Case_Closure_Reason__c,
            ),
          ),
        )
        .toMap
    } yield getrecords.DeliveryRecordsApiResponse(results, deliveryProblemMap, contactPhoneNumbers)

}



object GetDeliveryRecordsServiceImpl {

  private case class SubscriptionRecordQueryResult(
    Buyer__r: SFApiContactPhoneNumbers,
    Delivery_Records__r: Option[RecordsWrapperCaseClass[SFApiDeliveryRecord]],
  )

  @tailrec
  private def detectChangeSkippingNoneAtHead[T](
    allPrevious: List[DeliveryRecord],
    fieldExtractor: DeliveryRecord => Option[T],
  )(
    value: T,
  ): Boolean = allPrevious match {
    case head :: tail =>
      fieldExtractor(head) match {
        case Some(previousValue) => value != previousValue // this detects the change
        case None => detectChangeSkippingNoneAtHead(tail, fieldExtractor)(value) // this skips over a None at the head
      }
    case Nil =>
      false // if we reach the beginning of the list and we don't have an address to compare to, don't mark this as changed
  }

  private def transformSfApiDeliveryRecords(
    accumulator: List[DeliveryRecord],
    sfRecord: SFApiDeliveryRecord,
  ): List[DeliveryRecord] =
    DeliveryRecord(
      id = sfRecord.Id,
      deliveryDate = sfRecord.Delivery_Date__c,
      deliveryAddress = sfRecord.Delivery_Address__c,
      addressLine1 = sfRecord.Address_Line_1__c,
      addressLine2 = sfRecord.Address_Line_2__c,
      addressLine3 = sfRecord.Address_Line_3__c,
      addressTown = sfRecord.Address_Town__c,
      addressCountry = sfRecord.Address_Country__c,
      addressPostcode = sfRecord.Address_Postcode__c,
      deliveryInstruction = sfRecord.Delivery_Instructions__c,
      hasHolidayStop = sfRecord.Has_Holiday_Stop__c,
      bulkSuspensionReason =
        sfRecord.Holiday_Stop_Request_Detail__r.flatMap(_.Holiday_Stop_Request__r.Bulk_Suspension_Reason__c),
      problemCaseId = sfRecord.Case__r.map(_.Id),
      isChangedAddress =
        sfRecord.Delivery_Address__c.map(detectChangeSkippingNoneAtHead(accumulator, _.deliveryAddress)),
      isChangedDeliveryInstruction =
        sfRecord.Delivery_Instructions__c.map(detectChangeSkippingNoneAtHead(accumulator, _.deliveryInstruction)),
      credit = sfRecord.Credit_Amount__c.map(creditAmount =>
        DeliveryProblemCredit(
          amount = creditAmount,
          invoiceDate = sfRecord.Invoice_Date__c,
          isActioned = sfRecord.Is_Actioned__c,
        ),
      ),
    ) :: accumulator

  // this is done with a nested query so one can distinguish between the contact not owning subscription and there
  // simply being no delivery records, due to the hierarchical nature of the Salesforce response
  def deliveryRecordsQuery(
    contact: Contact,
    subscriptionNumber: String,
    optionalStartDate: Option[LocalDate],
    optionalEndDate: Option[LocalDate],
    optionalCancellationEffectiveDate: Option[LocalDate],
  ): String =
    s"""SELECT Buyer__r.Id, Buyer__r.Phone, Buyer__r.HomePhone, Buyer__r.MobilePhone, Buyer__r.OtherPhone, (
       |    SELECT Id, Delivery_Date__c, Delivery_Address__c, Delivery_Instructions__c, Has_Holiday_Stop__c,
       |           Holiday_Stop_Request_Detail__r.Holiday_Stop_Request__r.Bulk_Suspension_Reason__c,
       |           Address_Line_1__c,Address_Line_2__c, Address_Line_3__c, Address_Town__c, Address_Country__c, Address_Postcode__c,
       |           Case__c, Case__r.Id, Case__r.CaseNumber, Case__r.Subject, Case__r.Description, Case__r.Case_Closure_Reason__c,
       |           Credit_Amount__c, Is_Actioned__c, Invoice_Date__c
       |    FROM Delivery_Records__r
       |    ${deliveryDateFilter(optionalStartDate, optionalEndDate, optionalCancellationEffectiveDate)}
       |    ORDER BY Delivery_Date__c DESC
       |)
       |FROM SF_Subscription__c WHERE Name = '${escapeString(subscriptionNumber)}'
       |                         AND ${contactToWhereClausePart(contact)}""".stripMargin

  private def deliveryDateFilter(
    optionalStartDate: Option[LocalDate],
    optionalEndDate: Option[LocalDate],
    optionalCancellationEffectiveDate: Option[LocalDate],
  ) = {
    List(
      optionalStartDate.map(startDate => s"Delivery_Date__c >= $startDate "),
      optionalEndDate.map(endDate => s"Delivery_Date__c <= $endDate"),
      optionalCancellationEffectiveDate.map(date => s"Invoice_Date__c >= $date AND Credit_Requested__c = true"),
    ).flatten match {
      case Nil => ""
      case nonEmpty => s" WHERE ${nonEmpty.mkString(" AND ")}"
    }
  }

  private def getDeliveryRecordsFromQueryResults(
    subscriptionId: String,
    contact: Contact,
    queryResult: RecordsWrapperCaseClass[SubscriptionRecordQueryResult],
  ): Either[DeliveryRecordServiceError, List[SFApiDeliveryRecord]] = {
    queryResult.records.headOption
      .toRight(
        DeliveryRecordServiceSubscriptionNotFound(
          s"Subscription '$subscriptionId' not found or did not belong to contact " +
            s"'$contact'",
        ),
      )
      .map(deliverRecordsOption => deliverRecordsOption.Delivery_Records__r.map(_.records).getOrElse(Nil))
  }

}
