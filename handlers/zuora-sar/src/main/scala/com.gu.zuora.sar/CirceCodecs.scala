package com.gu.zuora.sar

import com.gu.zuora.sar.BatonModels.{BatonTaskStatus, Completed, Failed, Pending, PerformSarRequest, PerformSarResponse, SarInitiateRequest, SarInitiateResponse, SarRequest, SarResponse, SarStatusRequest, SarStatusResponse}
import io.circe.Json

object circeCodecs {
  import io.circe.syntax._
  import io.circe.{Decoder, Encoder}
  import io.circe.{JsonObject, ParsingFailure}
  import io.circe.generic.auto._

  implicit val sarRequestDecoder: Decoder[SarRequest] =
    Decoder.instance[SarRequest] { cursor =>
      cursor.downField("dataProvider").as[String].flatMap {
        case "zuora" => cursor.as[String]
        case unrecognisedProvider: String =>
          throw new ParsingFailure(
            s"invalid data provider : $unrecognisedProvider",
            null
          )
      }

      cursor.downField("action").as[String].flatMap {
        case "status" => cursor.as[SarStatusRequest]
        case "initiate" => cursor.as[SarInitiateRequest]
        case "perform" => cursor.as[PerformSarRequest]
      }
    }

  private def addAdditionalFields(
    response: JsonObject,
    action: String
  ): Json =
    response
      .add("action", action.asJson)
      .add("requestType", "SAR".asJson)
      .asJson

  implicit val batonTaskStatusEncoder: Encoder[BatonTaskStatus] =
    Encoder.encodeString.contramap {
      case Pending => "pending"
      case Completed => "completed"
      case Failed => "failed"
    }

  implicit val sarResponseEncoder: Encoder[SarResponse] = Encoder.instance {
    case ir: SarInitiateResponse =>
      addAdditionalFields(ir.asJsonObject, "initiate")
    case sr: SarStatusResponse =>
      addAdditionalFields(sr.asJsonObject, "status")
    case psr: PerformSarResponse =>
      addAdditionalFields(psr.asJsonObject, "perform")
  }

  implicit val performSarRequestEncoder: Encoder[PerformSarRequest] =
    Encoder.instance { psr =>
      addAdditionalFields(psr.asJsonObject, "perform")
    }

  //just used for tests
  implicit val batonRequestEncoder: Encoder[SarRequest] = Encoder.instance {
    case ir: SarInitiateRequest =>
      addAdditionalFields(ir.asJsonObject, "initiate")
    case sr: SarStatusRequest =>
      addAdditionalFields(sr.asJsonObject, "status")
    case psr: PerformSarRequest =>
      addAdditionalFields(psr.asJsonObject, "perform")
  }
}
