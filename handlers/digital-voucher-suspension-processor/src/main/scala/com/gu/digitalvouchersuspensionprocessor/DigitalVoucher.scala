package com.gu.digitalvouchersuspensionprocessor

import cats.data.EitherT
import cats.effect.Sync
import com.gu.digitalvouchersuspensionprocessor.Salesforce.Suspension
import com.gu.imovo.{ImovoClient, ImovoClientException, ImovoErrorResponse, SfSubscriptionId}
import io.circe.generic.auto._
import io.circe.parser.decode

object DigitalVoucher {

  def suspend[F[_]: Sync](
      imovo: ImovoClient[F],
      suspension: Suspension,
  ): EitherT[F, DigitalVoucherSuspendFailure, Unit] =
    imovo
      .suspendSubscriptionVoucher(
        subscriptionId = SfSubscriptionId(suspension.Holiday_Stop_Request__r.SF_Subscription__c),
        startDate = suspension.Stopped_Publication_Date__c,
        endDateExclusive = suspension.Stopped_Publication_Date__c.plusDays(1),
      )
      .leftFlatMap {
        case e @ ImovoClientException(_, _) if isExistingSuspension(e) =>
          EitherT.fromEither(
            Right[DigitalVoucherSuspendFailure, Unit](()),
          )
        case e =>
          EitherT.fromEither(
            Left[DigitalVoucherSuspendFailure, Unit](DigitalVoucherSuspendFailure(e.message)),
          )
      }

  private def isExistingSuspension(e: ImovoClientException): Boolean =
    (for {
      responseBody <- e.responseBody.toRight(false)
      response <- decode[ImovoErrorResponse](responseBody).left.map(_ => false)
    } yield response.errorMessages ==
      Seq("Unable to create holiday, conflicting holiday found between entered dates"))
      .fold(_ => false, identity)
}
