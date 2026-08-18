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

case class AsyncJobReport(
    status: AsyncJobStatus,
    errors: Option[String],
    result: Option[AsyncOrderResult],
)

case class AsyncOrderResult(status: OrderStatus, invoiceNumbers: Option[List[String]] = None)

sealed trait AsyncJobStatus {
  def value: String
}

object AsyncJobStatus {
  case object Processing extends AsyncJobStatus {
    override val value: String = "Processing"
  }
  case object Failed extends AsyncJobStatus {
    override val value: String = "Failed"
  }
  case object Completed extends AsyncJobStatus {
    override val value: String = "Completed"
  }

  implicit val decoder: Decoder[AsyncJobStatus] = Decoder.decodeString.emap {
    case Processing.value => Right(Processing)
    case Failed.value => Right(Failed)
    case Completed.value => Right(Completed)
    case status => Left(s"Unknown Zuora async job status: $status")
  }
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
