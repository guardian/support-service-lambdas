package com.gu.recogniser

import cats.syntax.all._
import com.amazonaws.services.lambda.runtime._
import com.gu.aws.AwsCloudWatch
import com.gu.aws.AwsCloudWatch._
import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.util.config.{LoadConfigModule, Stage}
import com.gu.util.zuora.{ZuoraRestConfig, ZuoraRestRequestMaker}
import com.gu.zuora.reports._
import com.gu.zuora.reports.aqua.ZuoraAquaRequestMaker
import okhttp3.{Request, Response}

import java.io.{InputStream, OutputStream}
import java.time.LocalDate

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
      steps = Steps(log, error(stage, _), RawEffects.downloadResponse, RawEffects.response, zuoraRestConfig, () => RawEffects.now().toLocalDate)
      _ <- steps.execute().leftMap(failure => new RuntimeException(s"execution has failed: $failure"))
    } yield ()
    val _ = maybeSuccess.toTry.get // throws exception if something failed
    log("finished successfully - sending metric!")
    putMetric(stage)
  }

  /*
  this is alarmed in the cfn
   */
  def error(stage: Stage, message: String) = {
    println(s"FAILURE - sending metric: $message")
    AwsCloudWatch.metricPut(MetricRequest(
      MetricNamespace("support-service-lambdas"),
      MetricName("could-not-recognise-revenue"),
      Map(
        MetricDimensionName("Stage") -> MetricDimensionValue(stage.value),
        MetricDimensionName("app") -> MetricDimensionValue("revenue-recogniser-job")
      )
    )).get // rethrow errors
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
    )).get // rethrow errors
  }

}

object Steps {
  def apply(
    log: String => Unit,
    error: String => Unit,
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
      today,
      error,
      new RevenueSchedulesQuerier(
        log,
        new BlockingAquaQueryImpl(aquaQuerier, downloadRequests, log),
        GetSubscription(requests)
      ),
      DistributeRevenueOnSpecificDate(requests),
      DistributeRevenueWithDateRange(requests)
    )
  }
}

class Steps(
  log: String => Unit,
  today: () => LocalDate,
  error: String => Unit,
  revenueSchedulesQuerier: RevenueSchedulesQuerier,
  distributeRevenueOnSpecificDate: DistributeRevenueOnSpecificDate,
  distributeRevenueWithDateRange: DistributeRevenueWithDateRange,
) {
  val partitionSchedules: PartitionSchedules = new PartitionSchedules(today, log, error)

  def execute(): Either[String, Unit] = {

    for {
      undistributedScheduled <- revenueSchedulesQuerier.execute()
      (revenueSchedulesToDistributeToday, revenueSchedulesToDistributeRange) = partitionSchedules.partition(undistributedScheduled)
      _ <- distributeForQueryRow(revenueSchedulesToDistributeToday, revenueSchedulesToDistributeRange)
//      _ = log("now query again and assert there are none")
//      stillUndistributedRevenue <- revenueSchedulesQuerier.execute()
//      numberNotDone = stillUndistributedRevenue.to(LazyList).length
//      _ <- if (numberNotDone > 0) Left(s"there were still revenue schedules: $numberNotDone") else Right(())
    } yield ()

  }

  private def distributeForQueryRow(revenueSchedulesToDistributeToday: List[DistributeToday], revenueSchedulesToDistributeRange: List[DistributeRange]): Either[String, Unit] = {
    for {
      _ <- revenueSchedulesToDistributeToday.traverse { distributeToday =>
        import distributeToday._
        // Find all undistributed rev sch on unredeemed subs >12 months old and distribute “today”
        log(s"sub is expired, recognise today only: $distributeToday")
        distributeRevenueOnSpecificDate.distribute(expiredCodeSchedule, today()).toDisjunction.leftMap(_.toString)
      }
      _ <- revenueSchedulesToDistributeRange.traverse { distributeRange =>
        import distributeRange._
        // Find all undistributed rev sch on redeemed subs and distribute across the redemptiondate->termenddate
        log(s"sub is redeemed then refunded, so recognise over the same period it was purchased: $distributeRange")
        distributeRevenueWithDateRange.distribute(refundSchedule, recognitionStart, recognitionEnd).toDisjunction.leftMap(_.toString)
      }
    } yield ()
  }

}
