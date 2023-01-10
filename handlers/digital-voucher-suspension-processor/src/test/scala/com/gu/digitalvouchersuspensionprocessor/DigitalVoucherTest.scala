package com.gu.digitalvouchersuspensionprocessor

import java.time.LocalDate

import cats.Id
import cats.data.EitherT
import com.gu.digitalvouchersuspensionprocessor.Salesforce.{HolidayStopRequest, Suspension}
import com.gu.digitalvouchersuspensionprocessor.Syncs.idSync
import com.gu.imovo.{ImovoClient, ImovoClientException, SfSubscriptionId}
import org.scalamock.scalatest.MockFactory
import org.scalatest.OneInstancePerTest
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class DigitalVoucherTest extends AnyFlatSpec with Matchers with MockFactory with OneInstancePerTest {

  private val subscriptionNumber = "subNum"
  private val sfSubscriptionId = "sfId"
  private val suspendedDate = LocalDate.parse("2020-10-01")
  private val suspension = Suspension(
    Id = "id",
    Stopped_Publication_Date__c = suspendedDate,
    Holiday_Stop_Request__r = HolidayStopRequest(
      SF_Subscription__c = sfSubscriptionId,
      Subscription_Name__c = subscriptionNumber,
    ),
  )

  private val imovo = mock[ImovoClient[Id]]

  "suspend" should "return unit after successfully suspending a subscription" in {
    (imovo.suspendSubscriptionVoucher _)
      .expects(
        SfSubscriptionId(sfSubscriptionId),
        suspendedDate,
        suspendedDate.plusDays(1),
      )
      .returns(EitherT[Id, ImovoClientException, Unit](Right(())))

    DigitalVoucher.suspend(imovo, suspension).value shouldBe Right(())
  }

  it should "return a failure after failing to suspend a subscription" in {
    (imovo.suspendSubscriptionVoucher _)
      .expects(
        SfSubscriptionId(sfSubscriptionId),
        suspendedDate,
        suspendedDate.plusDays(1),
      )
      .returns(EitherT[Id, ImovoClientException, Unit](Left(ImovoClientException("failed"))))

    DigitalVoucher.suspend(imovo, suspension).value shouldBe Left(
      DigitalVoucherSuspendFailure("failed"),
    )
  }

  it should "return a failure after failing to suspend a past subscription" in {
    (imovo.suspendSubscriptionVoucher _)
      .expects(
        SfSubscriptionId(sfSubscriptionId),
        suspendedDate,
        suspendedDate.plusDays(1),
      )
      .returns(
        EitherT[Id, ImovoClientException, Unit](
          Left(
            ImovoClientException(
              message = "failed",
              Some(
                """{"errorMessages":["Invalid Request: Please enter a reactivation date in the future"],"successfulRequest":false}""",
              ),
            ),
          ),
        ),
      )

    DigitalVoucher.suspend(imovo, suspension).value shouldBe Left(
      DigitalVoucherSuspendFailure("failed"),
    )
  }

  it should "return a unit if subscription has already been suspended on given date" in {
    (imovo.suspendSubscriptionVoucher _)
      .expects(
        SfSubscriptionId(sfSubscriptionId),
        suspendedDate,
        suspendedDate.plusDays(1),
      )
      .returns(
        EitherT[Id, ImovoClientException, Unit](
          Left(
            ImovoClientException(
              message = s"""
          |Request GET\n
          |https://domain/Subscription/SetHoliday?
          |SubscriptionId=$sfSubscriptionId&StartDate=$suspendedDate&
          |ReactivationDate=${suspendedDate.plusDays(1)}\n
          |failed with response ({"errorMessages":
          |["Unable to create holiday, conflicting holiday found between entered dates"],\n
          |"successfulRequest":false})"))))
          |""".stripMargin,
              responseBody = Some(
                """{"errorMessages":["Unable to create holiday, conflicting holiday found between entered dates"],"successfulRequest":false}""",
              ),
            ),
          ),
        ),
      )

    DigitalVoucher.suspend(imovo, suspension).value shouldBe Right(())
  }
}
