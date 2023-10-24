package com.gu.newproduct.api.addsubscription

import com.amazonaws.services.lambda.runtime.Context
import com.gu.effects.sqs.AwsSQSSend.{EmailQueueName, QueueName}
import com.gu.effects.sqs.{AwsSQSSend, SqsAsync}
import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.newproduct.api.addsubscription.TypeConvert._
import com.gu.newproduct.api.addsubscription.email.digipack.DigipackAddressValidator
import com.gu.newproduct.api.addsubscription.validation._
import com.gu.newproduct.api.addsubscription.validation.guardianweekly.{GuardianWeeklyDomesticAddressValidator, GuardianWeeklyROWAddressValidator}
import com.gu.newproduct.api.addsubscription.validation.paper.PaperAddressValidator
import com.gu.newproduct.api.addsubscription.zuora.CreateSubscription.SubscriptionName
import com.gu.newproduct.api.addsubscription.zuora.CreateSubscription.WireModel.{WireCreateRequest, WireSubscription}
import com.gu.newproduct.api.addsubscription.zuora.GetAccount.WireModel.ZuoraAccount
import com.gu.newproduct.api.addsubscription.zuora._
import com.gu.newproduct.api.productcatalog.PlanId.{GuardianWeeklyDomestic6for6, GuardianWeeklyDomesticQuarterly, GuardianWeeklyROW6for6, GuardianWeeklyROWQuarterly}
import com.gu.newproduct.api.productcatalog._
import com.gu.paperround.client.{GetAgents, PaperRoundConfig, PaperRoundRestRequestMaker}
import com.gu.util.Logging
import com.gu.util.apigateway.ApiGatewayHandler.{LambdaIO, Operation}
import com.gu.util.apigateway.ResponseModels.ApiResponse
import com.gu.util.apigateway.{ApiGatewayHandler, ApiGatewayRequest, ApiGatewayResponse}
import com.gu.util.config.LoadConfigModule.StringFromS3
import com.gu.util.config.{LoadConfigModule, Stage, ZuoraEnvironment}
import com.gu.util.reader.AsyncTypes._
import com.gu.util.reader.Types._
import com.gu.util.zuora.{ZuoraRestConfig, ZuoraRestRequestMaker}
import okhttp3.{Request, Response}

import java.io.{InputStream, OutputStream}
import java.time.LocalDateTime
import scala.concurrent.Future

object Handler extends Logging {
  // Referenced in Cloudformation
  def apply(inputStream: InputStream, outputStream: OutputStream, context: Context): Unit =
    ApiGatewayHandler(LambdaIO(inputStream, outputStream, context)) {
      Steps.operationForEffects(
        RawEffects.response,
        RawEffects.stage,
        GetFromS3.fetchString,
        SqsAsync.send(SqsAsync.buildClient),
        RawEffects.now,
      )
    }
}

trait AddSpecificProduct {
  def addProduct(request: AddSubscriptionRequest): AsyncApiGatewayOp[SubscriptionName]
}

class handleRequest(
  addSupporterPlus: AddSpecificProduct,
  addContribution: AddSpecificProduct,
  addPaperSub: AddSpecificProduct,
  addDigipackSub: AddSpecificProduct,
  addGuardianWeeklyDomesticSub: AddSpecificProduct,
  addGuardianWeeklyROWSub: AddSpecificProduct,
) {
  def apply(apiGatewayRequest: ApiGatewayRequest): Future[ApiResponse]
  = (for {
    request <- apiGatewayRequest.bodyAsCaseClass[AddSubscriptionRequest]().withLogging("parsed request").toAsync
    addSpecificProduct = request.planId match {
      case _: SupporterPlusPlanId => addSupporterPlus
      case _: ContributionPlanId => addContribution
      case _: VoucherPlanId => addPaperSub
      case _: HomeDeliveryPlanId => addPaperSub
      case _: DigipackPlanId => addDigipackSub
      case _: GuardianWeeklyDomestic => addGuardianWeeklyDomesticSub
      case _: GuardianWeeklyRow => addGuardianWeeklyROWSub
      case _: DigitalVoucherPlanId => addPaperSub
      case _: NationalDeliveryPlanId => addPaperSub
    }
    subscriptionName <- addSpecificProduct.addProduct(request)
  } yield ApiGatewayResponse(body = AddedSubscription(subscriptionName.value), statusCode = "200")).apiResponse
}

object Steps {

  def operationForEffects(
      response: Request => Response,
      stage: Stage,
      fetchString: StringFromS3,
      awsSQSSend: QueueName => AwsSQSSend.Payload => Future[Unit],
      currentDatetime: () => LocalDateTime,
  ): ApiGatewayOp[Operation] =
    for {
      zuoraIds <- ZuoraIds.zuoraIdsForStage(stage).toApiGatewayOp(ApiGatewayResponse.internalServerError _)
      loadConfig = LoadConfigModule(stage, fetchString)
      zuoraConfig <- loadConfig.load[ZuoraRestConfig].toApiGatewayOp("load zuora config")
      zuoraClient = ZuoraRestRequestMaker(response, zuoraConfig)
      currentDate = () => currentDatetime().toLocalDate

      paperRoundConfig <- loadConfig.load[PaperRoundConfig].toApiGatewayOp("load zuora config")
      paperRoundClient = PaperRoundRestRequestMaker(response, paperRoundConfig)
      getAgents = GetAgents(paperRoundClient)

      validatorFor = DateValidator.validatorFor(currentDate, _: DateRule)
      zuoraEnv = ZuoraEnvironment.EnvForStage(stage)
      plansWithPrice <- PricesFromZuoraCatalog(zuoraEnv, fetchString, zuoraIds.rateplanIdToApiId.get)
        .toApiGatewayOp("get prices from zuora catalog")
      getPricesForPlan = (planId: PlanId) => plansWithPrice.getOrElse(planId, Map.empty)
      startDateFromProductType <- StartDateFromFulfilmentFiles(stage, fetchString, currentDate())
        .toApiGatewayOp("get fulfilment date files")
      catalog = NewProductApi.catalog(getPricesForPlan, startDateFromProductType, currentDate())

      isValidStartDateForPlan = Function.uncurried(
        catalog andThen { plan =>
          StartDateValidator.fromRule(validatorFor, plan.startDateRules)
        },
      )
      createSubscription = CreateSubscription(zuoraClient.post[WireCreateRequest, WireSubscription], currentDate) _

      supporterPlusSteps = AddSupporterPlus.wireSteps(
        catalog,
        zuoraIds,
        zuoraClient,
        isValidStartDateForPlan,
        createSubscription,
        awsSQSSend,
        EmailQueueName,
        currentDate,
      )

      contributionSteps = AddContribution.wireSteps(
        catalog,
        zuoraIds,
        zuoraClient,
        isValidStartDateForPlan,
        createSubscription,
        awsSQSSend,
        EmailQueueName,
        currentDate,
      )

      paperSteps = AddPaperSub.wireSteps(
        catalog,
        zuoraIds,
        zuoraClient,
        isValidStartDateForPlan,
        PaperAddressValidator.apply,
        createSubscription,
        awsSQSSend,
        EmailQueueName,
        getAgents,
      )

      digipackSteps = AddDigipackSub.wireSteps(
        catalog,
        zuoraIds,
        zuoraClient,
        isValidStartDateForPlan,
        DigipackAddressValidator.apply,
        createSubscription,
        awsSQSSend,
        EmailQueueName,
        currentDate,
      )

      guardianWeeklyDomesticStep = AddGuardianWeeklySub.wireSteps(
        catalog,
        zuoraIds,
        zuoraClient,
        isValidStartDateForPlan,
        GuardianWeeklyDomesticAddressValidator.apply,
        createSubscription,
        awsSQSSend,
        EmailQueueName,
        GuardianWeeklyDomestic6for6,
        GuardianWeeklyDomesticQuarterly,
      )

      guardianWeeklyROWStep = AddGuardianWeeklySub.wireSteps(
        catalog,
        zuoraIds,
        zuoraClient,
        isValidStartDateForPlan,
        GuardianWeeklyROWAddressValidator.apply,
        createSubscription,
        awsSQSSend,
        EmailQueueName,
        GuardianWeeklyROW6for6,
        GuardianWeeklyROWQuarterly,
      )

      addSubSteps = new handleRequest(
        addSupporterPlus = supporterPlusSteps,
        addContribution = contributionSteps,
        addPaperSub = paperSteps,
        addDigipackSub = digipackSteps,
        addGuardianWeeklyDomesticSub = guardianWeeklyDomesticStep,
        addGuardianWeeklyROWSub = guardianWeeklyROWStep,
      )

      configuredOp = Operation.async(
        steps = addSubSteps.apply,
        healthcheck =
          () => HealthCheck(GetAccount(zuoraClient.get[ZuoraAccount]), AccountIdentitys.accountIdentitys(stage)),
      )
    } yield configuredOp

}
