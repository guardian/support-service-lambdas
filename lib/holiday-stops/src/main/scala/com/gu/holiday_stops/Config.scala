package com.gu.holiday_stops

import com.gu.salesforce.SalesforceAuthenticate.SFAuthConfig
import com.gu.util.config.LoadConfigModule.StringFromS3
import com.gu.util.config.{ConfigLocation, LoadConfigModule, Stage}
import play.api.libs.json.{Json, Reads}

case class Config(
  zuoraConfig: ZuoraConfig,
  sfConfig: SFAuthConfig,
  holidayCreditProduct: HolidayCreditProduct,
  guardianWeeklyProductRatePlanIds: List[String]
)

/**
 * Single flattened model representing Holiday Credit product, because there exists
 * one-to-one mapping between productRatePlanId and productRatePlanChargeId.
 */
case class HolidayCreditProduct(
  productRatePlanId: String,
  productRatePlanChargeId: String
)

case class ZuoraConfig(
  baseUrl: String,
  holidayStopProcessor: HolidayStopProcessor
)

case class HolidayStopProcessor(oauth: Oauth)

case class Oauth(clientId: String, clientSecret: String)

object Config {

  /**
   * How to find productrateplan IDs?
   *
   * https://{{zuoraUrlPrefix}}/query/jobs
   *
   * {
   *   "query": "select id, name from productrateplan limit 201",
   *   "outputFormat": "JSON",
   *   "compression": "NONE",
   *   "retries": 1,
   *   "output": {
   *     "target": "API_RESPONSE"
   *   }
   * }
   */
  val guardianWeeklyProductRatePlanIdsPROD = List(
    // Product: {"id":"2c92a0ff-6619-bf89-0166-1aa3247c4b1d", "name":"Guardian Weekly - Domestic"}
    "2c92a0fe6619b4b901661aa8e66c1692", // "name": "GW Oct 18 - Annual - Domestic"
    "2c92a0fe6619b4b301661aa494392ee2", // "name": "GW Oct 18 - Quarterly - Domestic"

    // Product: {"2c92a0fe-6619-b4b9-0166-1aaf826435de", "name":"Guardian Weekly - ROW"}
    "2c92a0fe6619b4b601661ab300222651", // "name":"GW Oct 18 - Annual - ROW"
    "2c92a0086619bf8901661ab02752722f", // "name":"GW Oct 18 - Quarterly - ROW"

    // Product: {"id":"2c92a0fd-57d0-a987-0157-d73fa27c3de1","name":"Guardian Weekly Zone A"}
    "2c92a0fd57d0a9870157d7412f19424f", // "name":"Guardian Weekly Quarterly"
    "2c92a0ff57d0a0b60157d741e722439a", // "name":"Guardian Weekly Annual"

    // Product: {"id":"2c92a0fe-57d0-a0c4-0157-d74240d35541","name":"Guardian Weekly Zone B"}
    "2c92a0fe57d0a0c40157d74241005544", // "name":"Guardian Weekly Quarterly"
    "2c92a0fe57d0a0c40157d74240de5543", // "name":"Guardian Weekly Annual"

    // Product: {"id":"2c92a0ff-58bd-f4eb-0158-f307ecc102ad","name":"Guardian Weekly Zone C"}
    "2c92a0ff58bdf4eb0158f307ed0e02be", // "name":"Guardian Weekly Quarterly"
    "2c92a0ff58bdf4eb0158f307eccf02af" // "name":"Guardian Weekly Annual"
  )

  val guardianWeeklyProductRatePlanIdsUAT = List(
    // Product: {"id":"2c92a0ff-6619-bf89-0166-1aa3247c4b1d", "name":"Guardian Weekly - Domestic"}
    "2c92c0f9660fc4d70166107fa5412641", // "name": "GW Oct 18 - Annual - Domestic"
    "2c92c0f8660fb5d601661081ea010391", // "name": "GW Oct 18 - Quarterly - Domestic"

    // Product: {"2c92a0fe-6619-b4b9-0166-1aaf826435de", "name":"Guardian Weekly - ROW"}
    "2c92c0f9660fc4d70166109a2eb0607c", // "name":"GW Oct 18 - Annual - ROW"
    "2c92c0f9660fc4d70166109c01465f10", // "name":"GW Oct 18 - Quarterly - ROW"

    "2c92c0f8574ebcdf015751506daf54c4", // "name":"Guardian Weekly Quarterly"
    "2c92c0f8574654af015747f934cc4a04", // "name":"Guardian Weekly Annual"

    "2c92c0f9574ee3d80157514ee1c36a8e", // "name":"Guardian Weekly Quarterly"
    "2c92c0f8574ebcdf015751506d7154ae", // "name":"Guardian Weekly Annual"

    "2c92c0f958aa45650158da23e5eb29d8", // "name":"Guardian Weekly Quarterly"
    "2c92c0f958aa45650158da23e5ab29c9" // "name":"Guardian Weekly Annual"
  )

  val guardianWeeklyProductRatePlanIdsDEV = List(
    // Product: {"id":"2c92c0f8-65d2-72ef-0165-f14cc19d238a", "name":"Guardian Weekly - Domestic"}
    "2c92c0f965d280590165f16b1b9946c2", // "name": "GW Oct 18 - Annual - Domestic"
    "2c92c0f965dc30640165f150c0956859", // "name": "GW Oct 18 - Quarterly - Domestic"

    // Product: {"2c92c0f9-65f2-121e-0166-0fb1f1057b1a", "name":"Guardian Weekly - ROW"}
    "2c92c0f965f2122101660fb33ed24a45", // "name":"GW Oct 18 - Annual - ROW"
    "2c92c0f965f2122101660fb81b745a06", // "name":"GW Oct 18 - Quarterly - ROW"

    "2c92c0f8574b2b8101574c4a9480068d", // "name":"Guardian Weekly Annual"
    "2c92c0f8574b2b8101574c4a957706be", // "name":"Guardian Weekly Quarterly"

    "2c92c0f8574b2be601574c323ca15c7e", // "name":"Guardian Weekly Quarterly"
    "2c92c0f8574b2be601574c39888d6850", // "name":"Guardian Weekly Annual"

    "2c92c0f858aa38af0158da325cec0b2e", // "name":"Guardian Weekly Quarterly"
    "2c92c0f858aa38af0158da325d2f0b3d", // "name":"Guardian Weekly Annual"
  )

  implicit val oAuthØReads = Json.reads[Oauth]
  implicit val holidayStopProcessorReads = Json.reads[HolidayStopProcessor]
  implicit val sfAuthConfigReads = Json.reads[SFAuthConfig]
  implicit val zuoraConfigReads = Json.reads[ZuoraConfig]

  private def zuoraCredentials(stage: String, fetchString: StringFromS3): Either[OverallFailure, ZuoraConfig] = {
    credentials[ZuoraConfig](stage, "zuoraRest", fetchString)
  }

  private def salesforceCredentials(stage: String, fetchString: StringFromS3): Either[OverallFailure, SFAuthConfig] = {
    credentials[SFAuthConfig](stage, "sfAuth", fetchString)
  }

  private def credentials[T](stage: String, filePrefix: String, fetchString: StringFromS3)(implicit reads: Reads[T]): Either[OverallFailure, T] = {
    val loadConfigModule = LoadConfigModule(Stage(stage), fetchString)
    loadConfigModule
      .apply[T](ConfigLocation(filePrefix, 1), reads)
      .leftMap(failure => OverallFailure(failure.error))
      .toEither
  }

  def apply(fetchString: StringFromS3): Either[OverallFailure, Config] = {
    val stage = Option(System.getenv("Stage")).getOrElse("DEV")
    for {
      zuoraConfig <- zuoraCredentials(stage, fetchString)
      sfConfig <- salesforceCredentials(stage, fetchString)
    } yield {
      stage match {
        case "PROD" =>
          Config(
            zuoraConfig,
            sfConfig,
            HolidayCreditProduct(
              productRatePlanId = "2c92a0076ae9189c016b080c930a6186",
              productRatePlanChargeId = "2c92a0086ae928d7016b080f638477a6"
            ),
            guardianWeeklyProductRatePlanIdsPROD
          )
        case "CODE" =>
          Config(
            zuoraConfig,
            sfConfig,
            HolidayCreditProduct(
              productRatePlanId = "2c92c0f86b0378b0016b08112e870d0a",
              productRatePlanChargeId = "2c92c0f86b0378b0016b08112ec70d14"
            ),
            guardianWeeklyProductRatePlanIdsUAT
          )
        case "DEV" =>
          Config(
            zuoraConfig,
            sfConfig,
            HolidayCreditProduct(
              productRatePlanId = "2c92c0f96b03800b016b081fc04f1ba2",
              productRatePlanChargeId = "2c92c0f96b03800b016b081fc0f41bb4"
            ),
            guardianWeeklyProductRatePlanIdsDEV
          )
      }
    }
  }
}
