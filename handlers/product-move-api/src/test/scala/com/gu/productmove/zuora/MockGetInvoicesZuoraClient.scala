package com.gu.productmove.zuora

import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes.ErrorResponse
import com.gu.productmove.zuora.GetInvoiceItemsForSubscription.{InvoiceItemsForSubscription, PostBody, getZuoraQuery}
import com.gu.productmove.zuora.rest.ZuoraRestBody
import sttp.client3.Request
import sttp.model.Uri
import zio.{IO, ZIO}
import com.gu.productmove.zuora.rest.ZuoraClient

object MockGetInvoicesZuoraClient {
  type ClientResponse = String
  val standardSubResponse: ClientResponse =
    """
      |{
      |    "size": 2,
      |    "records": [
      |        {
      |            "ChargeDate": "2023-03-06T13:03:38.000+00:00",
      |            "UnitPrice": 20,
      |            "SubscriptionNumber": "A-S00502641",
      |            "ProductName": "Supporter Plus",
      |            "ServiceEndDate": "2023-04-05",
      |            "ServiceStartDate": "2023-03-06",
      |            "ChargeName": "Supporter Plus Monthly",
      |            "Id": "8ad08c8486b5ec340186b70539931853",
      |            "InvoiceId": "8ad08c8486b5ec340186b70539871852",
      |            "ChargeAmount": 20,
      |            "ChargeNumber": "C-00837124"
      |        },
      |        {
      |            "ChargeDate": "2023-03-06T13:07:06.000+00:00",
      |            "UnitPrice": 20,
      |            "SubscriptionNumber": "A-S00502641",
      |            "ProductName": "Supporter Plus",
      |            "ServiceEndDate": "2023-04-05",
      |            "ServiceStartDate": "2023-03-06",
      |            "ChargeName": "Supporter Plus Monthly",
      |            "Id": "8ad09b2186b5fdb50186b70866b02115",
      |            "InvoiceId": "8ad09b2186b5fdb50186b708669f2114",
      |            "ChargeAmount": -20,
      |            "ChargeNumber": "C-00837124"
      |        }
      |    ],
      |    "done": true
      |}
      |""".stripMargin
  val switchedResponse: ClientResponse =
    """
      |{
      |    "size": 6,
      |    "records": [
      |        {
      |            "ChargeDate": "2023-02-14T22:03:32.000+00:00",
      |            "UnitPrice": 20,
      |            "SubscriptionNumber": "A-S00492211",
      |            "ProductName": "Contributor",
      |            "ServiceEndDate": "2023-03-13",
      |            "ServiceStartDate": "2023-02-14",
      |            "ChargeName": "Contribution",
      |            "Id": "8ad081c6864e90cc018651f4568e06b0",
      |            "InvoiceId": "8ad081c6864e90cc018651f4568306af",
      |            "ChargeAmount": 20,
      |            "ChargeNumber": "C-00819652"
      |        },
      |        {
      |            "ChargeDate": "2023-03-03T15:23:15.000+00:00",
      |            "UnitPrice": 20,
      |            "SubscriptionNumber": "A-S00492211",
      |            "ProductName": "Contributor",
      |            "ServiceEndDate": "2023-03-13",
      |            "ServiceStartDate": "2023-03-03",
      |            "ChargeName": "Contribution",
      |            "Id": "8ad08d2986a18ded0186a811f7f16e02",
      |            "InvoiceId": "8ad08d2986a18ded0186a811f7e56e01",
      |            "ChargeAmount": -7.86,
      |            "ChargeNumber": "C-00819652"
      |        },
      |        {
      |            "ChargeDate": "2023-03-03T15:23:15.000+00:00",
      |            "UnitPrice": 20,
      |            "SubscriptionNumber": "A-S00492211",
      |            "ProductName": "Supporter Plus",
      |            "ServiceEndDate": "2023-04-02",
      |            "ServiceStartDate": "2023-03-03",
      |            "ChargeName": "Supporter Plus Monthly",
      |            "Id": "8ad08d2986a18ded0186a811f7f16e03",
      |            "InvoiceId": "8ad08d2986a18ded0186a811f7e56e01",
      |            "ChargeAmount": 20,
      |            "ChargeNumber": "C-00834502"
      |        },
      |        {
      |            "ChargeDate": "2023-03-03T15:29:39.000+00:00",
      |            "UnitPrice": 20,
      |            "SubscriptionNumber": "A-S00492211",
      |            "ProductName": "Supporter Plus",
      |            "ServiceEndDate": "2023-04-02",
      |            "ServiceStartDate": "2023-03-03",
      |            "ChargeName": "Supporter Plus Monthly",
      |            "Id": "8ad0934e86a19cca0186a817d564251f",
      |            "InvoiceId": "8ad0934e86a19cca0186a817d551251e",
      |            "ChargeAmount": -20,
      |            "ChargeNumber": "C-00834502"
      |        },
      |        {
      |            "ChargeDate": "2023-03-03T15:29:39.000+00:00",
      |            "UnitPrice": 20,
      |            "SubscriptionNumber": "A-S00492211",
      |            "ProductName": "Contributor",
      |            "ServiceEndDate": "2023-03-13",
      |            "ServiceStartDate": "2023-02-14",
      |            "ChargeName": "Contribution",
      |            "Id": "8ad0934e86a19cca0186a817d5642520",
      |            "InvoiceId": "8ad0934e86a19cca0186a817d551251e",
      |            "ChargeAmount": -20,
      |            "ChargeNumber": "C-00819652"
      |        },
      |        {
      |            "ChargeDate": "2023-03-03T15:29:39.000+00:00",
      |            "UnitPrice": 20,
      |            "SubscriptionNumber": "A-S00492211",
      |            "ProductName": "Contributor",
      |            "ServiceEndDate": "2023-03-13",
      |            "ServiceStartDate": "2023-03-03",
      |            "ChargeName": "Contribution",
      |            "Id": "8ad0934e86a19cca0186a817d5642521",
      |            "InvoiceId": "8ad0934e86a19cca0186a817d551251e",
      |            "ChargeAmount": 7.86,
      |            "ChargeNumber": "C-00819652"
      |        }
      |    ],
      |    "done": true
      |}
      |""".stripMargin
}

class MockGetInvoicesZuoraClient(response: MockGetInvoicesZuoraClient.ClientResponse) extends ZuoraClient {

  override def send(request: Request[Either[String, String], Any]): IO[ErrorResponse, String] =
    ZIO.succeed(response);

}
