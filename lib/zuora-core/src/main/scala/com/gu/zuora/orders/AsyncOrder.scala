package com.gu.zuora.orders

import io.circe.{Decoder, DecodingFailure}

sealed trait AsyncJobSubmission

object AsyncJobSubmission {
  case class Accepted(jobId: String) extends AsyncJobSubmission
  case object Rejected extends AsyncJobSubmission

  implicit val decoder: Decoder[AsyncJobSubmission] = Decoder.instance { cursor =>
    cursor.downField("success").as[Boolean].flatMap {
      case true =>
        cursor
          .downField("jobId")
          .as[String]
          .map(Accepted.apply)
          .left
          .map(_ => DecodingFailure("Zuora accepted the order without returning a job ID", cursor.history))
      case false => Right(Rejected)
    }
  }
}

sealed trait AsyncJobReport

object AsyncJobReport {
  case object Processing extends AsyncJobReport
  case class Failed(errors: Option[String]) extends AsyncJobReport
  case class Completed(result: AsyncOrderResult) extends AsyncJobReport

  implicit val decoder: Decoder[AsyncJobReport] = Decoder.instance { cursor =>
    cursor.downField("status").as[String].flatMap {
      case "Processing" => Right(Processing)
      case "Failed" => cursor.downField("errors").as[Option[String]].map(Failed.apply)
      case "Completed" =>
        cursor
          .downField("result")
          .as[Option[AsyncOrderResult]]
          .flatMap {
            case Some(result) => Right(Completed(result))
            case None =>
              Left(DecodingFailure("Zuora completed the async job without returning an order result", cursor.history))
          }
      case status => Left(DecodingFailure(s"Unknown Zuora async job status: $status", cursor.history))
    }
  }
}

case class AsyncOrderResult(status: OrderStatus)

object AsyncOrderResult {
  implicit val decoder: Decoder[AsyncOrderResult] =
    Decoder.forProduct1("status")(AsyncOrderResult.apply)
}

sealed trait OrderStatus {
  def value: String
}

object OrderStatus {
  case object Draft extends OrderStatus {
    override val value: String = "Draft"
  }
  case object Pending extends OrderStatus {
    override val value: String = "Pending"
  }
  case object Completed extends OrderStatus {
    override val value: String = "Completed"
  }
  case object Cancelled extends OrderStatus {
    override val value: String = "Cancelled"
  }
  case object Scheduled extends OrderStatus {
    override val value: String = "Scheduled"
  }
  case object Executing extends OrderStatus {
    override val value: String = "Executing"
  }
  case object Failed extends OrderStatus {
    override val value: String = "Failed"
  }

  implicit val decoder: Decoder[OrderStatus] = Decoder.decodeString.emap {
    case Draft.value => Right(Draft)
    case Pending.value => Right(Pending)
    case Completed.value => Right(Completed)
    case Cancelled.value => Right(Cancelled)
    case Scheduled.value => Right(Scheduled)
    case Executing.value => Right(Executing)
    case Failed.value => Right(Failed)
    case status => Left(s"Unknown Zuora order status: $status")
  }
}
