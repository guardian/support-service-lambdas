package com.gu.zuora.rer

import BatonModels.{
  BatonTaskStatus,
  Completed,
  Failed,
  Pending,
  PerformRerRequest,
  PerformRerResponse,
  RerInitiateRequest,
  RerInitiateResponse,
  RerRequest,
  RerResponse,
  RerStatusRequest,
  RerStatusResponse,
}
import io.circe.{HCursor, Json}
import io.circe.syntax._
import io.circe.{Decoder, Encoder}
import io.circe.JsonObject
import io.circe.generic.auto._

object circeCodecs {

  implicit val rerRequestDecoder: Decoder[RerRequest] =
    Decoder.instance[RerRequest] { cursor =>
      def dataProviderIsZuora(cursor: HCursor): Boolean =
        cursor.downField("dataProvider").as[String] match {
          case Left(_) => false
          case Right(dataProvider) => dataProvider == "zuorarer"
        }

      cursor.downField("action").as[String].flatMap {
        case "status" => cursor.as[RerStatusRequest]
        case "initiate" => cursor.as[RerInitiateRequest].ensuring(dataProviderIsZuora(cursor))
        case "perform" => cursor.as[PerformRerRequest].ensuring(dataProviderIsZuora(cursor))
      }
    }

  private def addAdditionalFields(
      response: JsonObject,
      action: String,
  ): Json =
    response
      .add("action", action.asJson)
      .add("requestType", "RER".asJson)
      .add("dataProvider", "zuorarer".asJson)
      .asJson

  implicit val batonTaskStatusEncoder: Encoder[BatonTaskStatus] =
    Encoder.encodeString.contramap {
      case Pending => "pending"
      case Completed => "completed"
      case Failed => "failed"
    }

  implicit val rerResponseEncoder: Encoder[RerResponse] = Encoder.instance {
    case ir: RerInitiateResponse =>
      addAdditionalFields(ir.asJsonObject, "initiate")
    case sr: RerStatusResponse =>
      addAdditionalFields(sr.asJsonObject, "status")
    case psr: PerformRerResponse =>
      addAdditionalFields(psr.asJsonObject, "perform")
  }

  implicit val performRerRequestEncoder: Encoder[PerformRerRequest] =
    Encoder.instance { psr =>
      addAdditionalFields(psr.asJsonObject, "perform")
    }

  implicit val batonRequestEncoder: Encoder[RerRequest] = Encoder.instance {
    case ir: RerInitiateRequest =>
      addAdditionalFields(ir.asJsonObject, "initiate")
    case sr: RerStatusRequest =>
      addAdditionalFields(sr.asJsonObject, "status")
    case psr: PerformRerRequest =>
      addAdditionalFields(psr.asJsonObject, "perform")
  }
}
