package com.gu.util.zuora

import com.gu.util.resthttp.RestRequestMaker
import com.gu.util.resthttp.Types.ClientSuccess
import okhttp3.{MediaType, Protocol, Request, RequestBody, Response, ResponseBody}
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class ZuoraGetInvoiceTest extends AnyFlatSpec with Matchers {

  "ZuoraGetInvoice" should "look up the invoice ID from the invoice number returned by an order" in {
    val response = (request: Request) => {
      request.method() shouldBe "GET"
      request.url().toString shouldBe "https://rest.test.zuora.com/v1/invoices/INV-000001"

      new Response.Builder()
        .code(200)
        .request(
          new Request.Builder()
            .url("https://rest.test.zuora.com")
            .post(RequestBody.create(MediaType.parse("application/json"), ""))
            .build(),
        )
        .protocol(Protocol.HTTP_1_1)
        .message("OK")
        .body(ResponseBody.create(MediaType.parse("application/json"), """{"id":"invoice-id","success":true}"""))
        .build()
    }

    val requests = new RestRequestMaker.Requests(
      headers = Map.empty,
      baseUrl = "https://rest.test.zuora.com/v1/",
      getResponse = response,
      jsonIsSuccessful = _ => throw new AssertionError("The legacy success check must not parse the v1 response"),
    )

    ZuoraGetInvoice(requests)("INV-000001") shouldBe ClientSuccess("invoice-id")
  }
}
