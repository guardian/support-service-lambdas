package com.gu.productmove.zuora

import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes.ErrorResponse
import com.gu.productmove.zuora.rest.ZuoraRestBody
import sttp.client3.Request
import sttp.model.Uri
import zio.{IO, ZIO}
import com.gu.productmove.zuora.rest.ZuoraClient

import scala.collection.mutable

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

  val responseWithTaxToMatchTaxItems: ClientResponse =
    """
      |{
      |  "size": 4,
      |  "records": [
      |    {
      |      "ChargeDate": "2023-08-11T10:03:41.000+01:00",
      |      "TaxAmount": 0,
      |      "Id": "8ad081c689e27bbb0189e3d654fc04bb",
      |      "InvoiceId": "8ad081c689e27bbb0189e3d654f104ba",
      |      "ChargeAmount": 0
      |    },
      |    {
      |      "ChargeDate": "2023-08-11T10:03:41.000+01:00",
      |      "TaxAmount": 0.91,
      |      "Id": "8ad081c689e27bbb0189e3d654fc04bc",
      |      "InvoiceId": "8ad081c689e27bbb0189e3d654f104ba",
      |      "ChargeAmount": 9.09
      |    },
      |    {
      |      "ChargeDate": "2023-08-11T11:04:54.000+01:00",
      |      "TaxAmount": -0.91,
      |      "Id": "8ad08dc989e27bbe0189e40e611d0abb",
      |      "InvoiceId": "8ad08dc989e27bbe0189e40e61110aba",
      |      "ChargeAmount": -9.09
      |    },
      |    {
      |      "ChargeDate": "2023-08-11T11:04:54.000+01:00",
      |      "TaxAmount": 0,
      |      "Id": "8ad08dc989e27bbe0189e40e611d0abc",
      |      "InvoiceId": "8ad08dc989e27bbe0189e40e61110aba",
      |      "ChargeAmount": 0
      |    }
      |  ],
      |  "done": true
      |}
      |""".stripMargin
  val taxationItemsResponse: ClientResponse =
    """
      |{
      |    "size": 1,
      |    "records": [
      |        {
      |            "InvoiceItemId": "8ad08dc989e27bbe0189e40e611d0abb",
      |            "Id": "8ad08dc989e27bbe0189e40e60f80ab8",
      |            "InvoiceId": "8ad08dc989e27bbe0189e40e61110aba"
      |        }
      |    ],
      |    "done": true
      |}
      |""".stripMargin

  val invoiceItemsForAmountTest =
    """
    |{
    |  "size": 8,
    |  "records": [
    |    {
    |      "ChargeDate": "2023-08-02T06:00:19.000+01:00",
    |      "TaxAmount": 0.98,
    |      "UnitPrice": 15,
    |      "SubscriptionNumber": "A-S00573682",
    |      "ProductName": "Supporter Plus",
    |      "ServiceEndDate": "2023-09-01",
    |      "ServiceStartDate": "2023-08-02",
    |      "ChargeName": "Supporter Plus Monthly",
    |      "Id": "8ad0880589b2ecb50189b49e46f155c8",
    |      "InvoiceId": "8ad0880589b2ecb50189b49e46e755c7",
    |      "ChargeAmount": 14.02,
    |      "ChargeNumber": "C-00957752"
    |    },
    |    {
    |      "ChargeDate": "2023-07-02T06:08:59.000+01:00",
    |      "TaxAmount": 0.98,
    |      "UnitPrice": 15,
    |      "SubscriptionNumber": "A-S00573682",
    |      "ProductName": "Supporter Plus",
    |      "ServiceEndDate": "2023-08-01",
    |      "ServiceStartDate": "2023-07-02",
    |      "ChargeName": "Supporter Plus Monthly",
    |      "Id": "8ad0962d8906c8f401891501158551d0",
    |      "InvoiceId": "8ad0962d8906c8f401891501157751cd",
    |      "ChargeAmount": 14.02,
    |      "ChargeNumber": "C-00957752"
    |    },
    |    {
    |      "ChargeDate": "2023-06-02T11:04:16.000+01:00",
    |      "TaxAmount": 0.98,
    |      "UnitPrice": 15,
    |      "SubscriptionNumber": "A-S00573682",
    |      "ProductName": "Supporter Plus",
    |      "ServiceEndDate": "2023-07-01",
    |      "ServiceStartDate": "2023-06-02",
    |      "ChargeName": "Supporter Plus Monthly",
    |      "Id": "8ad096ca8876356b01887b90a42010fb",
    |      "InvoiceId": "8ad096ca8876356b01887b90a40e10fa",
    |      "ChargeAmount": 14.02,
    |      "ChargeNumber": "C-00957752"
    |    },
    |    {
    |      "ChargeDate": "2023-08-07T12:01:06.000+01:00",
    |      "TaxAmount": 0,
    |      "UnitPrice": 5,
    |      "SubscriptionNumber": "A-S00573682",
    |      "ProductName": "Supporter Plus",
    |      "ServiceEndDate": "2023-09-06",
    |      "ServiceStartDate": "2023-08-07",
    |      "ChargeName": "Contribution",
    |      "Id": "8ad09e2089cf509b0189cfa8615d6d27",
    |      "InvoiceId": "8ad09e2089cf509b0189cfa861436d26",
    |      "ChargeAmount": 5,
    |      "ChargeNumber": "C-01062166"
    |    },
    |    {
    |      "ChargeDate": "2023-08-07T12:01:06.000+01:00",
    |      "TaxAmount": 0.65,
    |      "UnitPrice": 10,
    |      "SubscriptionNumber": "A-S00573682",
    |      "ProductName": "Supporter Plus",
    |      "ServiceEndDate": "2023-09-06",
    |      "ServiceStartDate": "2023-08-07",
    |      "ChargeName": "Subscription",
    |      "Id": "8ad09e2089cf509b0189cfa8615d6d28",
    |      "InvoiceId": "8ad09e2089cf509b0189cfa861436d26",
    |      "ChargeAmount": 9.35,
    |      "ChargeNumber": "C-01062165"
    |    },
    |    {
    |      "ChargeDate": "2023-08-07T12:01:06.000+01:00",
    |      "TaxAmount": -0.82,
    |      "UnitPrice": 15,
    |      "SubscriptionNumber": "A-S00573682",
    |      "ProductName": "Supporter Plus",
    |      "ServiceEndDate": "2023-09-01",
    |      "ServiceStartDate": "2023-08-07",
    |      "ChargeName": "Supporter Plus Monthly",
    |      "Id": "8ad09e2089cf509b0189cfa8615d6d29",
    |      "InvoiceId": "8ad09e2089cf509b0189cfa861436d26",
    |      "ChargeAmount": -11.76,
    |      "ChargeNumber": "C-00957752"
    |    },
    |    {
    |      "ChargeDate": "2023-08-07T12:04:58.000+01:00",
    |      "TaxAmount": 0,
    |      "UnitPrice": 5,
    |      "SubscriptionNumber": "A-S00573682",
    |      "ProductName": "Supporter Plus",
    |      "ServiceEndDate": "2023-09-06",
    |      "ServiceStartDate": "2023-08-07",
    |      "ChargeName": "Contribution",
    |      "Id": "8ad09e2089cf509b0189cfabed300ab4",
    |      "InvoiceId": "8ad09e2089cf509b0189cfabed210ab2",
    |      "ChargeAmount": -5,
    |      "ChargeNumber": "C-01062166"
    |    },
    |    {
    |      "ChargeDate": "2023-08-07T12:04:58.000+01:00",
    |      "TaxAmount": -0.65,
    |      "UnitPrice": 10,
    |      "SubscriptionNumber": "A-S00573682",
    |      "ProductName": "Supporter Plus",
    |      "ServiceEndDate": "2023-09-06",
    |      "ServiceStartDate": "2023-08-07",
    |      "ChargeName": "Subscription",
    |      "Id": "8ad09e2089cf509b0189cfabed300ab6",
    |      "InvoiceId": "8ad09e2089cf509b0189cfabed210ab2",
    |      "ChargeAmount": -9.35,
    |      "ChargeNumber": "C-01062165"
    |    }
    |  ],
    |  "done": true
    |}
    |""".stripMargin

  val taxationItemsForAmountTest =
    """
      |{"size":1,"records":[{"InvoiceItemId":"8ad0880589b2ecb50189b49e46f155c8","Id":"8ad0880589b2ecb50189b49e46df55c6","InvoiceId":"8ad0880589b2ecb50189b49e46e755c7"}],"done":true}
      |""".stripMargin
}

class MockGetInvoicesZuoraClient(response: MockGetInvoicesZuoraClient.ClientResponse) extends ZuoraClient {

  override def send(request: Request[Either[String, String], Any]): IO[ErrorResponse, String] =
    ZIO.succeed(response);
}

class MockStackedGetInvoicesZuoraClient(responses: mutable.Stack[MockGetInvoicesZuoraClient.ClientResponse])
    extends ZuoraClient {

  override def send(request: Request[Either[String, String], Any]): IO[ErrorResponse, String] =
    ZIO.succeed(responses.pop);
}
