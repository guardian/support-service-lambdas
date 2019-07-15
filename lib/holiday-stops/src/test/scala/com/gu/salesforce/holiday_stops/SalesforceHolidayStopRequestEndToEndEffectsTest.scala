package com.gu.salesforce.holiday_stops

import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.salesforce.SalesforceAuthenticate.SFAuthConfig
import com.gu.salesforce.SalesforceClient
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequest._
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestActionedZuoraRef._
import com.gu.salesforce.holiday_stops.SalesforceSFSubscription.SubscriptionName
import com.gu.test.EffectsTest
import com.gu.util.Time
import com.gu.util.config.{LoadConfigModule, Stage}
import com.gu.util.resthttp.JsonHttp
import org.joda.time.LocalDate
import org.scalatest.{FlatSpec, Matchers}
import play.api.libs.json.JsValue
import scalaz.{-\/, \/-}

class SalesforceHolidayStopRequestEndToEndEffectsTest extends FlatSpec with Matchers {

  val SUBSCRIPTION_NAME = SubscriptionName("A-S00050817") // must exist in DEV SalesForce

  case class EndToEndResults(
    createResult: HolidayStopRequestId,
    preProcessingFetchResult: List[SalesforceHolidayStopRequest.HolidayStopRequest],
    processedResult: JsValue,
    postProcessingFetchResult: List[SalesforceHolidayStopRequest.HolidayStopRequest],
    deleteResult: String
  )

  it should "Salesforce Holiday Stop Requests should work end to end" taggedAs EffectsTest in {

    val startDate = HolidayStopRequestStartDate(LocalDate.now().plusDays(10))
    val endDate = HolidayStopRequestEndDate(LocalDate.now().plusDays(15))
    val lookupDate = LocalDate.now().plusDays(12)
    val productName = ProductName("Guardian Weekly")

    val actual = for {
      sfConfig <- LoadConfigModule(Stage("DEV"), GetFromS3.fetchString)[SFAuthConfig]
      response = RawEffects.response
      sfAuth <- SalesforceClient(response, sfConfig).value.toDisjunction

      createOp = SalesforceHolidayStopRequest.CreateHolidayStopRequest(sfAuth.wrapWith(JsonHttp.post))
      createResult <- createOp(NewHolidayStopRequest(
        startDate,
        endDate,
        SubscriptionNameLookup(SUBSCRIPTION_NAME)
      )).toDisjunction

      fetchOp = SalesforceHolidayStopRequest.LookupByDateAndProductNamePrefix(sfAuth.wrapWith(JsonHttp.getWithParams))
      preProcessingFetchResult <- fetchOp(lookupDate, productName).toDisjunction

      processOp = SalesforceHolidayStopRequestActionedZuoraRef.CreateHolidayStopRequestActionedZuoraRef(
        sfAuth.wrapWith(JsonHttp.post)
      )
      processedResult <- processOp(HolidayStopRequestActionedZuoraRef(
        Holiday_Stop_Request__c = createResult,
        HolidayStopRequestActionedZuoraChargeCode("C-1234567"),
        HolidayStopRequestActionedZuoraChargePrice(-12.34),
        StoppedPublicationDate(Time.toJavaDate(LocalDate.now))
      )).toDisjunction

      postProcessingFetchResult <- fetchOp(lookupDate, productName).toDisjunction

      deleteOp = SalesforceHolidayStopRequest.DeleteHolidayStopRequest(sfAuth.wrapWith(JsonHttp.deleteWithStringResponse))
      deleteResult <- deleteOp(createResult).toDisjunction

    } yield EndToEndResults(createResult, preProcessingFetchResult, processedResult, postProcessingFetchResult, deleteResult)

    actual match {

      case -\/(failure) => fail(failure.toString)

      case \/-(EndToEndResults(createResult, preProcessingFetchResult, _, postProcessingFetchResult, _)) =>

        withClue("should be able to find the freshly created Holiday Stop Request and its Actioned Count should be ZERO") {
          preProcessingFetchResult
            .find(_.Id == createResult)
            .filter(_.Actioned_Count__c.value == 0) should not be None
        }

        withClue("after processing the Actioned Count of Holiday Stop Request should have increased to ONE ") {
          postProcessingFetchResult
            .find(_.Id == createResult)
            .filter(_.Actioned_Count__c.value == 1) should not be None
        }
    }

  }

  it should "verify user owns subscription (via SalesForce)" taggedAs EffectsTest in {

    val actual = for {
      sfConfig <- LoadConfigModule(Stage("DEV"), GetFromS3.fetchString)[SFAuthConfig]
      response = RawEffects.response
      sfAuth <- SalesforceClient(response, sfConfig).value.toDisjunction

      verifyIdentityIdOwnsSubOp = SalesforceSFSubscription.CheckForSubscriptionGivenNameAndIdentityID(sfAuth.wrapWith(JsonHttp.getWithParams))
      shouldBeSome <- verifyIdentityIdOwnsSubOp(SUBSCRIPTION_NAME, "100003511").toDisjunction
      shouldBeNone <- verifyIdentityIdOwnsSubOp(SUBSCRIPTION_NAME, "some_other_identity_id").toDisjunction
    } yield (shouldBeSome, shouldBeNone)

    actual match {

      case \/-((Some(_), None)) => println("identity ID verification worked")

      case -\/(failure) => fail(failure.toString)

      case _ => fail("didn't verify the identity ID")
    }
  }

}
