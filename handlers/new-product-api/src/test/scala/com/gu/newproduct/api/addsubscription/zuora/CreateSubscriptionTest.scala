package com.gu.newproduct.api.addsubscription.zuora

import java.time.LocalDate

import com.gu.newproduct.api.addsubscription.zuora.CreateSubscription.WireModel.{
  WireCreateOrderRequest,
  WireOrderResponse,
}
import com.gu.newproduct.api.addsubscription.zuora.CreateSubscription.{
  ChargeOverride,
  SubscriptionName,
  ZuoraCreateSubRequest,
  ZuoraCreateSubRequestRatePlan,
}
import com.gu.newproduct.api.addsubscription.zuora.GetAccount.AccountNumber
import com.gu.newproduct.api.addsubscription._
import com.gu.newproduct.api.productcatalog.AmountMinorUnits
import com.gu.newproduct.api.productcatalog.ZuoraIds.{PlanAndCharge, ProductRatePlanChargeId, ProductRatePlanId}
import com.gu.util.resthttp.RestRequestMaker.{RequestsPost, WithCheck}
import com.gu.util.resthttp.Types.{ClientSuccess, GenericError}
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers
import play.api.libs.json.Json

class CreateSubscriptionTest extends AnyFlatSpec with Matchers {

  private val currentDate = () => LocalDate.of(2018, 7, 2)

  it should "build a create subscription order" in {
    val ids = PlanAndCharge(
      productRatePlanId = ProductRatePlanId("hiProductRatePlanId"),
      productRatePlanChargeId = ProductRatePlanChargeId("hiProductRatePlanChargeId"),
    )
    val createRequest = ZuoraCreateSubRequest(
      accountNumber = AccountNumber("A00012345"),
      acceptanceDate = LocalDate.of(2018, 7, 27),
      acquisitionCase = CaseId("casecase"),
      acquisitionSource = AcquisitionSource("sourcesource"),
      createdByCSR = CreatedByCSR("csrcsr"),
      deliveryAgent = Some(DeliveryAgent("deliveryagent")),
      ratePlans = List(
        ZuoraCreateSubRequestRatePlan(
          productRatePlanId = ids.productRatePlanId,
          maybeChargeOverride = Some(
            ChargeOverride(
              amountMinorUnits = Some(AmountMinorUnits(125)),
              productRatePlanChargeId = ids.productRatePlanChargeId,
              triggerDate = Some(LocalDate.of(2020, 1, 1)),
            ),
          ),
        ),
      ),
    )
    val expectedJson = Json.parse("""
      {
        "orderDate":"2018-07-02",
        "existingAccountNumber":"A00012345",
        "subscriptions":[{
          "orderActions":[{
            "type":"CreateSubscription",
            "triggerDates":[
              {"name":"ContractEffective","triggerDate":"2018-07-02"},
              {"name":"CustomerAcceptance","triggerDate":"2018-07-27"}
            ],
            "createSubscription":{
              "terms":{
                "autoRenew":true,
                "initialTerm":{"termType":"TERMED","period":12,"periodType":"Month"},
                "renewalSetting":"RENEW_WITH_SPECIFIC_TERM",
                "renewalTerms":[{"period":12,"periodType":"Month"}]
              },
              "subscribeToRatePlans":[{
                "productRatePlanId":"hiProductRatePlanId",
                "chargeOverrides":[{
                  "productRatePlanChargeId":"hiProductRatePlanChargeId",
                  "pricing":{"recurringFlatFee":{"listPrice":1.25}},
                  "startDate":{"triggerEvent":"SpecificDate","specificTriggerDate":"2020-01-01"}
                }]
              }]
            }
          }],
          "customFields":{
            "AcquisitionCase__c":"casecase",
            "AcquisitionSource__c":"sourcesource",
            "CreatedByCSR__c":"csrcsr",
            "DeliveryAgent__c":"deliveryagent",
            "LastPlanAddedDate__c":"2018-07-02"
          }
        }],
        "processingOptions":{"runBilling":true,"collectPayment":true}
      }
    """)

    Json.toJson(CreateSubscription.createRequest(currentDate(), createRequest)) shouldBe expectedJson
  }

  it should "create a subscription through orders" in {
    val createRequest = ZuoraCreateSubRequest(
      accountNumber = AccountNumber("A00012345"),
      acceptanceDate = LocalDate.of(2018, 7, 27),
      acquisitionCase = CaseId("casecase"),
      acquisitionSource = AcquisitionSource("sourcesource"),
      createdByCSR = CreatedByCSR("csrcsr"),
      deliveryAgent = Some(DeliveryAgent("deliveryagent")),
      ratePlans = List(
        ZuoraCreateSubRequestRatePlan(
          productRatePlanId = ProductRatePlanId("hiProductRatePlanId"),
          maybeChargeOverride = None,
        ),
      ),
    )
    val post: RequestsPost[WireCreateOrderRequest, WireOrderResponse] = {
      case (_, "orders", WithCheck) => ClientSuccess(WireOrderResponse(List("A-S00012345")))
      case input => GenericError(s"bad request: $input")
    }

    CreateSubscription(post, currentDate)(createRequest) shouldBe ClientSuccess(SubscriptionName("A-S00012345"))
  }

  it should "fail when Zuora returns anything other than one subscription" in {
    val createRequest = ZuoraCreateSubRequest(
      accountNumber = AccountNumber("A00012345"),
      acceptanceDate = LocalDate.of(2018, 7, 27),
      acquisitionCase = CaseId("casecase"),
      acquisitionSource = AcquisitionSource("sourcesource"),
      createdByCSR = CreatedByCSR("csrcsr"),
      deliveryAgent = None,
      ratePlans = Nil,
    )
    val post: RequestsPost[WireCreateOrderRequest, WireOrderResponse] = {
      case (_, "orders", WithCheck) => ClientSuccess(WireOrderResponse(Nil))
      case input => GenericError(s"bad request: $input")
    }

    CreateSubscription(post, currentDate)(createRequest).isFailure shouldBe true
  }
}
