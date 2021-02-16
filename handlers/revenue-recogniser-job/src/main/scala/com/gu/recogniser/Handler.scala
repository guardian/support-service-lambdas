package com.gu.recogniser

import cats.syntax.all._
import com.amazonaws.services.lambda.runtime._
import com.gu.aws.AwsCloudWatch
import com.gu.aws.AwsCloudWatch._
import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.recogniser.RevenueSchedule.csvFields
import com.gu.util.config.{LoadConfigModule, Stage}
import com.gu.util.zuora.{ZuoraRestConfig, ZuoraRestRequestMaker}
import com.gu.zuora.reports._
import com.gu.zuora.reports.aqua.ZuoraAquaRequestMaker
import okhttp3.{Request, Response}

import java.io.{InputStream, OutputStream}

object Handler extends RequestStreamHandler {

  //referenced in cloudformation, change with care
  def handleRequest(
    input: InputStream,
    output: OutputStream,
    context: Context
  ): Unit = {
    def log(message: String) = context.getLogger.log(message)

    log("starting lambda!")
    val stage = RawEffects.stage
    val loadConfig = LoadConfigModule(stage, GetFromS3.fetchString)
    val maybeSuccess = for {
      zuoraRestConfig <- loadConfig[ZuoraRestConfig]
      steps = Steps(log, RawEffects.downloadResponse, RawEffects.response, zuoraRestConfig, () => RawEffects.now().toLocalDate)
      _ <- steps.execute().leftMap(failure => new RuntimeException(s"execution has failed: $failure"))
    } yield ()
    val _ = maybeSuccess.toTry.get // throws exception if something failed
    log("finished successfully - sending metric!")
    putMetric(stage)
  }

  /*
  this is alarmed in the cfn
   */
  def putMetric(stage: Stage): Unit = {
    AwsCloudWatch.metricPut(MetricRequest(
      MetricNamespace("support-service-lambdas"),
      MetricName("job-succeeded"),
      Map(
        MetricDimensionName("Stage") -> MetricDimensionValue(stage.value),
        MetricDimensionName("app") -> MetricDimensionValue("revenue-recogniser-job")
      )
    ))
  }

}
import kantan.csv.HeaderDecoder

import java.time.LocalDate

case class RevenueSchedule(
  number: String,
  undistributedAmountInPence: Int,
)

object RevenueSchedule {

  val csvFields = List(
    "RevenueSchedule.Number",
    "RevenueSchedule.UndistributedAmount",
  )

  implicit val decoder: HeaderDecoder[RevenueSchedule] = csvFields match {
    case a1 :: a2 :: Nil =>
      HeaderDecoder.decoder(a1, a2)((number: String, amount: Double) => RevenueSchedule(number, (amount * 100).toInt))
  }

}


object Steps {
  def apply(
    log: String => Unit,
    downloadResponse: Request => Response,
    response: Request => Response,
    zuoraRestConfig: ZuoraRestConfig,
    today: () => LocalDate
  ): Steps = {
    val requests = ZuoraRestRequestMaker(response, zuoraRestConfig)
    val downloadRequests = ZuoraAquaRequestMaker(downloadResponse, zuoraRestConfig)
    val aquaQuerier = Querier.lowLevel(downloadRequests) _
    new Steps(
      log,
      new BlockingAquaQueryImpl(aquaQuerier, downloadRequests, log),
      today,
      DistributeRevenueOnSpecificDate(requests),
      DistributeRevenueWithDateRange(requests),
    )
  }
}

class Steps(
  log: String => Unit,
  blockingAquaQuery: BlockingAquaQuery,
  today: () => LocalDate,
  distributeRevenueOnSpecificDate: DistributeRevenueOnSpecificDate,
  distributeRevenueWithDateRange: DistributeRevenueWithDateRange,
) {

  def execute(): Either[String, Unit] = {
    val oneYearAgo: LocalDate = today().minusYears(1)
    val expiredGiftsAndRefunds =
      s"""select ${csvFields.mkString(", ")}
         |from RevenueSchedule
         |where Rule = 'Digital Subscription Gift Rule'
         | AND (
         |      UndistributedAmount < 0
         |  OR (UndistributedAmount > 0 AND subscription.termstartdate <= '$oneYearAgo')
         | )
         |""".stripMargin
    for {
      undistributedRevenue <- blockingAquaQuery.executeQuery[RevenueSchedule](expiredGiftsAndRefunds).toDisjunction.leftMap(_.toString)
      revenueSchedulesToDistribute <- undistributedRevenue.toList.sequence.leftMap(_.toString)
      _ = revenueSchedulesToDistribute.map {
        case RevenueSchedule(expiredCodeSchedule, amount) if amount > 0 =>
          log(s"distribute on a single day: $expiredCodeSchedule $amount")
          distributeRevenueOnSpecificDate.distribute(expiredCodeSchedule, today())
        case RevenueSchedule(refundSchedule, amount) if amount < 0 =>
          log(s"distribute refund: $refundSchedule $amount")
        //TODO
      }
      _ = log("now query again and assert there are none")
      stillUndistributedRevenue <- blockingAquaQuery.executeQuery[RevenueSchedule](expiredGiftsAndRefunds).toDisjunction.leftMap(_.toString)
      numberNotDone = stillUndistributedRevenue.to(LazyList).length
      _ <- if (numberNotDone > 0) Left(s"there were still revenue schedules: $numberNotDone") else Right(())
    } yield ()

  }

}
