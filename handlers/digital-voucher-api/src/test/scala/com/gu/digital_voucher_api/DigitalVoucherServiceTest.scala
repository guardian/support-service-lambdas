package com.gu.digital_voucher_api

import java.time.LocalDate

import cats.Id
import cats.data.EitherT
import com.gu.imovo.{ImovoClient, ImovoClientException, SfSubscriptionId}
import org.scalamock.scalatest.MockFactory
import org.scalatest.OneInstancePerTest
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class DigitalVoucherServiceTest extends AnyFlatSpec with Matchers with MockFactory with OneInstancePerTest {

  private val sfSubId = SfSubscriptionId("fogishgrihrogh")
  private val startDate = LocalDate.parse("2020-08-17")
  private val endDateExclusive = LocalDate.parse("2020-08-22")

  private val mockImovo = mock[ImovoClient[Id]]

  "suspendVoucher" should "return unit if successful" in {
    (mockImovo.suspendSubscriptionVoucher _)
      .expects(sfSubId, startDate, endDateExclusive)
      .returns(EitherT[Id, ImovoClientException, Unit](Right(())))

    val result =
      DigitalVoucherService(mockImovo).suspendVoucher(sfSubId, startDate, endDateExclusive).value
    result shouldBe Right(())
  }

  it should "return service error if unsuccessful" in {
    (mockImovo.suspendSubscriptionVoucher _)
      .expects(sfSubId, startDate, endDateExclusive)
      .returns(EitherT[Id, ImovoClientException, Unit](Left(ImovoClientException("failed"))))

    val result =
      DigitalVoucherService(mockImovo).suspendVoucher(sfSubId, startDate, endDateExclusive).value
    result shouldBe Left(ImovoOperationFailedException("failed"))
  }
}
