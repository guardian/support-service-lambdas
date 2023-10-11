package com.gu.delivery_records_api.service.createproblem

import cats.Monad
import cats.data.EitherT
import com.gu.delivery_records_api.service.{DeliveryRecordServiceError, DeliveryRecordServiceGenericError}
import com.gu.salesforce.Contact
import com.gu.salesforce.sttp.SalesforceClient

class CreateDeliveryProblemServiceImpl[F[_]: Monad](salesforceClient: SalesforceClient[F])
    extends CreateDeliveryProblemService[F] {

  override def createDeliveryProblemForSubscription(
      subscriptionNumber: String,
      contact: Contact,
      detail: CreateDeliveryProblem,
  ): EitherT[F, DeliveryRecordServiceError, Unit] = {
    salesforceClient
      .composite[SFApiCompositePartBody](
        SFApiCreateDeliveryProblem.create(
          subscriptionNumber,
          contact,
          detail,
        ),
      )
      .bimap(error => DeliveryRecordServiceGenericError(error.toString), _ => ())
  }

}
