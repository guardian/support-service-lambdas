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
      |            "TaxAmount": 0,
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
      |            "TaxAmount": 0,
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
      |            "TaxAmount": 0,
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
      |            "TaxAmount": 0,
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
      |            "TaxAmount": 0,
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
      |            "TaxAmount": 0,
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
      |            "TaxAmount": 0,
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
      |            "TaxAmount": 0,
      |            "ChargeNumber": "C-00819652"
      |        }
      |    ],
      |    "done": true
      |}
      |""".stripMargin
  val responseWithTax: ClientResponse =
    """
      |{
      |    "size": 4,
      |    "records": [
      |        {
      |            "ChargeDate": "2023-07-28T12:26:04.000+01:00",
      |            "TaxAmount": -0.24,
      |            "UnitPrice": 10,
      |            "SubscriptionNumber": "A-S01918489",
      |            "ProductName": "Supporter Plus",
      |            "ServiceEndDate": "2023-08-24",
      |            "ServiceStartDate": "2023-07-25",
      |            "ChargeName": "Supporter Plus Monthly Charge",
      |            "Id": "8a1289288995cad501899c3fa6be501d",
      |            "InvoiceId": "8a1289288995cad501899c3fa6b0501c",
      |            "ChargeAmount": -9.76,
      |            "ChargeNumber": "C-04460599"
      |        },
      |        {
      |            "ChargeDate": "2023-07-28T12:26:04.000+01:00",
      |            "TaxAmount": 0,
      |            "UnitPrice": 2,
      |            "SubscriptionNumber": "A-S01918489",
      |            "ProductName": "Supporter Plus",
      |            "ServiceEndDate": "2023-08-24",
      |            "ServiceStartDate": "2023-07-25",
      |            "ChargeName": "Contribution",
      |            "Id": "8a1289288995cad501899c3fa6be501e",
      |            "InvoiceId": "8a1289288995cad501899c3fa6b0501c",
      |            "ChargeAmount": -2,
      |            "ChargeNumber": "C-04460598"
      |        },
      |        {
      |            "ChargeDate": "2023-07-25T22:15:52.000+01:00",
      |            "TaxAmount": 0.24,
      |            "UnitPrice": 10,
      |            "SubscriptionNumber": "A-S01918489",
      |            "ProductName": "Supporter Plus",
      |            "ServiceEndDate": "2023-08-24",
      |            "ServiceStartDate": "2023-07-25",
      |            "ChargeName": "Supporter Plus Monthly Charge",
      |            "Id": "8a129f89898cbdf301898ee88c260860",
      |            "InvoiceId": "8a129f89898cbdf301898ee88c0f085f",
      |            "ChargeAmount": 9.76,
      |            "ChargeNumber": "C-04460599"
      |        },
      |        {
      |            "ChargeDate": "2023-07-25T22:15:52.000+01:00",
      |            "TaxAmount": 0,
      |            "UnitPrice": 2,
      |            "SubscriptionNumber": "A-S01918489",
      |            "ProductName": "Supporter Plus",
      |            "ServiceEndDate": "2023-08-24",
      |            "ServiceStartDate": "2023-07-25",
      |            "ChargeName": "Contribution",
      |            "Id": "8a129f89898cbdf301898ee88c260861",
      |            "InvoiceId": "8a129f89898cbdf301898ee88c0f085f",
      |            "ChargeAmount": 2,
      |            "ChargeNumber": "C-04460598"
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
