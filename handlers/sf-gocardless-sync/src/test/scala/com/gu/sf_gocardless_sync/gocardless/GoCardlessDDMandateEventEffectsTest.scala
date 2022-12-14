package com.gu.sf_gocardless_sync.gocardless

import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.sf_gocardless_sync.SyncSharedObjects.{
  BankAccountNumberEnding,
  BankName,
  Cause,
  Description,
  GoCardlessMandateID,
  GoCardlessMandateEventID,
  MandateCreatedAt,
  Reference,
  Status,
}
import com.gu.sf_gocardless_sync.gocardless.GoCardlessDDMandateEvent.GetBankDetail.GoCardlessCustomerBankDetail
import com.gu.sf_gocardless_sync.gocardless.GoCardlessDDMandateEvent.GetEventsSince.{
  GoCardlessEventDetails,
  GoCardlessEventLinks,
  GoCardlessMandateEvent,
  MandateEventWithMandateDetail,
}
import com.gu.sf_gocardless_sync.gocardless.GoCardlessDDMandateEvent.{
  GetBankDetail,
  GetEventsSince,
  GoCardlessCustomerBankAccountID,
  GoCardlessMandateDetail,
  GoCardlessMandateLinks,
}
import com.gu.test.EffectsTest
import com.gu.util.config.{LoadConfigModule, Stage}
import com.gu.util.resthttp.JsonHttp
import com.gu.util.resthttp.Types.ClientSuccess
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class GoCardlessDDMandateEventEffectsTest extends AnyFlatSpec with Matchers {

  it should "fetch a set of mandate events from GoCardless, with accompanying mandate detail" taggedAs EffectsTest in {

    val actual = for {
      goCardlessConfig <- LoadConfigModule(Stage("DEV"), GetFromS3.fetchString)[GoCardlessConfig]
      goCardlessClient = GoCardlessClient(RawEffects.response, goCardlessConfig)
      wiredOp = GetEventsSince(goCardlessClient.wrapWith(JsonHttp.get), 2)
    } yield wiredOp(GoCardlessMandateEventID("EV002140EW1YFZ"))

    actual shouldBe Right(
      ClientSuccess(
        List(
          MandateEventWithMandateDetail(
            GoCardlessMandateEvent(
              GoCardlessMandateEventID("EV00214371W8Q5"),
              "2018-11-02T11:03:50.652Z",
              Status("active"),
              GoCardlessEventLinks(GoCardlessMandateID("MD0004EMSRVH12")),
              GoCardlessEventDetails(
                Cause("mandate_activated"),
                Description(
                  "The time window after submission for the banks to refuse a mandate has " +
                    "ended without any errors being received, so this mandate is now active.",
                ),
                None,
              ),
            ),
            GoCardlessMandateDetail(
              GoCardlessMandateID("MD0004EMSRVH12"),
              MandateCreatedAt("2018-10-31T08:44:33.136Z"),
              Reference("B46YFKK"),
              GoCardlessMandateLinks(GoCardlessCustomerBankAccountID("BA0004CDWM71MX")),
            ),
          ),
          MandateEventWithMandateDetail(
            GoCardlessMandateEvent(
              GoCardlessMandateEventID("EV002142VDRGB1"),
              "2018-11-02T11:03:43.908Z",
              Status("active"),
              GoCardlessEventLinks(GoCardlessMandateID("MD0004ENP8MFV9")),
              GoCardlessEventDetails(
                Cause("mandate_activated"),
                Description(
                  "The time window after submission for the banks to refuse a mandate has " +
                    "ended without any errors being received, so this mandate is now active.",
                ),
                None,
              ),
            ),
            GoCardlessMandateDetail(
              GoCardlessMandateID("MD0004ENP8MFV9"),
              MandateCreatedAt("2018-10-31T11:22:00.308Z"),
              Reference("KBSM8BQ"),
              GoCardlessMandateLinks(GoCardlessCustomerBankAccountID("BA0004CETVHRSB")),
            ),
          ),
        ),
      ),
    )
  }

  it should "fetch bank details given a customer_account_id" taggedAs EffectsTest in {

    val actual = for {
      goCardlessConfig <- LoadConfigModule(Stage("DEV"), GetFromS3.fetchString)[GoCardlessConfig]
      response = RawEffects.response
      goCardlessClient = GoCardlessClient(response, goCardlessConfig)
      wiredOp = GetBankDetail(goCardlessClient.wrapWith(JsonHttp.get))
    } yield wiredOp(GoCardlessCustomerBankAccountID("BA0004D82Z5S0H"))

    actual shouldBe Right(
      ClientSuccess(
        GoCardlessCustomerBankDetail(
          BankAccountNumberEnding("11"),
          BankName("BARCLAYS BANK PLC"),
        ),
      ),
    )

  }

}
