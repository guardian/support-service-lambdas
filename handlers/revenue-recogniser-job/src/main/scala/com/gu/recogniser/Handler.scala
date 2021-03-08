package com.gu.recogniser

import cats.syntax.all._
import com.amazonaws.services.lambda.runtime._
import com.gu.aws.AwsCloudWatch
import com.gu.aws.AwsCloudWatch._
import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.recogniser.DistributeRevenueAcrossAccountingPeriods.RevenueDistribution
import com.gu.recogniser.GetRevenueSchedules.{RevenueItem, RevenueScheduleResponse}
import com.gu.recogniser.RevenueScheduleAquaRow.csvFields
import com.gu.util.config.{LoadConfigModule, Stage}
import com.gu.util.zuora.{ZuoraRestConfig, ZuoraRestRequestMaker}
import com.gu.zuora.reports._
import com.gu.zuora.reports.aqua.ZuoraAquaRequestMaker
import okhttp3.{Request, Response}

import java.io.{InputStream, OutputStream}
import java.time.LocalDate
import scala.util.Try

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
    putMetric(stage).get
  }

  /*
  this is alarmed in the cfn
   */
  def putMetric(stage: Stage): Try[Unit] = {
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
    val getRevenueSchedules = GetRevenueSchedules(requests)
    val distributeRevenueOnSpecificDate = DistributeRevenueOnSpecificDate(requests)
    new Steps(
      log,
      new BlockingAquaQueryImpl(aquaQuerier, downloadRequests, log),
      today,
      distributeRevenueOnSpecificDate,
      new DistributeRedeemedSub(
        DistributeRevenueAcrossAccountingPeriods(requests),
        distributeRevenueOnSpecificDate,
        getRevenueSchedules,
        today
      ),
      new DistributeUnredeemedSub(
        distributeRevenueOnSpecificDate,
        getRevenueSchedules,
        today
      )
    )
  }
}

class Steps(
  log: String => Unit,
  blockingAquaQuery: BlockingAquaQuery,
  today: () => LocalDate,
  distributeRevenueOnSpecificDate: DistributeRevenueOnSpecificDate,
  distributeRedeemedSub: DistributeRedeemedSub,
  distributeUnredeemedSub: DistributeUnredeemedSub
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
      undistributedRevenue <- blockingAquaQuery.executeQuery[RevenueScheduleAquaRow](
        expiredGiftsAndRefunds
      ).toDisjunction.leftMap(_.toString)
      revenueSchedulesToDistribute <- undistributedRevenue.toList.sequence.leftMap(_.toString)
      _ <- distributeForQueryRow(revenueSchedulesToDistribute)
      _ = log("now query again and assert there are none")
      stillUndistributedRevenue <- blockingAquaQuery.executeQuery[RevenueScheduleAquaRow](
        expiredGiftsAndRefunds
      ).toDisjunction.leftMap(_.toString)
      numberNotDone = stillUndistributedRevenue.to(LazyList).length
      _ <- if (numberNotDone > 0) Left(s"there were still revenue schedules: $numberNotDone") else Right(())
    } yield ()

  }

  private def distributeForQueryRow(revenueSchedulesToDistribute: List[RevenueScheduleAquaRow]): Either[String, Unit] =
    revenueSchedulesToDistribute.zipWithIndex.drop(32).traverse {
      case (RevenueScheduleAquaRow(expiredCodeSchedule, amount, _, _), index) if amount > 0 =>
        log(s"sub $index is expired, recognise today only: $expiredCodeSchedule $amount")
        distributeRevenueOnSpecificDate.distribute(expiredCodeSchedule, today()).toDisjunction.leftMap(_.toString)
      case (RevenueScheduleAquaRow(refundSchedule, amount, chargeId, true), index) if amount < 0 =>
        log(s"sub $index is redeemed then refunded, so recognise over the same period it was purchased: $refundSchedule $amount")
        distributeRedeemedSub.distribute(chargeId)
      case (RevenueScheduleAquaRow(refundSchedule, amount, chargeId, false), index) if amount < 0 =>
        log(s"sub $index is not redeemed, then refunded, so recognise both the purchase and the redemption today: $refundSchedule $amount")
        distributeUnredeemedSub.distribute(chargeId)
      case (row: RevenueScheduleAquaRow, index) =>
        log(s"mistake in query - no refund to make on row $index: $row")
        Left(s"mistake in query - no refund to make on row $index: $row")
    }.map((_: List[Unit]) => ())

}

class DistributeUnredeemedSub(
  distributeRevenueOnSpecificDate: DistributeRevenueOnSpecificDate,
  getRevenueSchedules: GetRevenueSchedules,
  today: () => LocalDate
) {

  def distribute(chargeId: String): Either[String, Unit] = {
    for {
      revenueSchedules <- getRevenueSchedules.execute(chargeId).toDisjunction.leftMap(_.toString)
      //TODO
      // ecpect exactly two rev sch.  both are undistributed and on the same charge
      // if they don't cancel, e.g. partial refund, then manual intervention is needed
      sch <- revenueSchedules.revenueSchedules.sortBy(_.undistributedAmountInPence) match {
        case refund :: purchase :: Nil if refund.undistributedAmountInPence + purchase.undistributedAmountInPence == 0 => Right(List(refund, purchase))
        case c1 :: c2 :: Nil => Left(
          s"the two schedules amounts did not cancel each other out: First schedule: $c1 Second schedule: $c2"
        )
//        case refund1 :: refund2 :: purchase :: Nil if refund1.undistributedAmountInPence == refund2.undistributedAmountInPence && refund1.undistributedAmountInPence + purchase.undistributedAmountInPence == 0 =>
//          // sometimes we do an refund + invoice item adjustment, then cancel the subscription causing a second invoice
//          // this means we will recognise the refund twice(!), but the second one will go into the credit balance.
//          Right(List(refund1, refund2, purchase))
        case other => Left(
          s"A were not exactly two revenue schedules for the unredeemed sub refunded charge: ${other.length} $other"
        )
      }
      _ <- sch.traverse(schedule => distributeRevenueOnSpecificDate.distribute(schedule.number, today())).toDisjunction.leftMap(_.toString)
    } yield ()
  }

}

class DistributeRedeemedSub(
  distributeRevenueAcrossAccountingPeriods: DistributeRevenueAcrossAccountingPeriods,
  distributeRevenueOnSpecificDate: DistributeRevenueOnSpecificDate,
  getRevenueSchedules: GetRevenueSchedules,
  today: () => LocalDate
) {

  case class RedeemedRefundedSchedules(
    distributedPurchase: RevenueScheduleResponse,
    undistributedRefund: List[RevenueScheduleResponse]
  )

  def distribute(chargeId: String): Either[String, Unit] = {
    for {
      revenueSchedules <- getRevenueSchedules.execute(chargeId).toDisjunction.leftMap(_.toString)
      // ecpect exactly two rev sch.  One is already fully distributed over some periods, the other is the refund
      // now we need to distribute the refund over the same periods.  But if any period is closed, we need to
      // roll that in to the next open period.
      sch <- revenueSchedules.revenueSchedules.sortBy(_.amount) match {
        // "The order of revenue schedules is descending by the updatedOn field."
        // which is "The date when the revenue automation start date was set"
        case refundSchedule :: purchaseSchedule :: Nil if purchaseSchedule.undistributedAmountInPence == 0 =>
          Right(RedeemedRefundedSchedules(purchaseSchedule, List(refundSchedule)))
        case c1 :: c2 :: Nil => Left(
          s"the two schedules, one should be distributed and the other is the refund: First schedule: $c1 Second schedule: $c2"
        )
        case refundSchedule1 :: refundSchedule2 :: purchaseSchedule :: Nil if purchaseSchedule.undistributedAmountInPence == 0 =>
          Right(RedeemedRefundedSchedules(purchaseSchedule, List(refundSchedule1, refundSchedule2)))
        case other => Left(
          s"B were not exactly two revenue schedules for the unredeemed sub refunded charge: ${other.length} $other"
        )
      }
      _ <- if (sch.undistributedRefund.exists(_.undistributedAmountInPence < 0)) Right(()) else
        Left(s"there must be an undistributed refund: First schedule: ${sch.distributedPurchase} Second schedule: ${sch.undistributedRefund}")
      _ <- if (sch.undistributedRefund.forall(_.amount == sch.distributedPurchase.amount * -1)) Right(()) else
        Left(s"the purchase and refund(s) schedules amounts did not cancel each other out: First schedule: ${sch.distributedPurchase} Second schedule: ${sch.undistributedRefund}")
      maybeRequiredRefundDistribution = requiredRefundDistribution(sch.distributedPurchase.revenueItems)
      _ <- sch.undistributedRefund.filter(_.undistributedAmountInPence < 0).traverse(undistributedRefund =>
        maybeRequiredRefundDistribution match {
          case Some(distribution) => // we can match at least some of the periods
            distributeRevenueAcrossAccountingPeriods.distribute(undistributedRefund.number, distribution).toDisjunction.leftMap(_.toString)
          case None => // all periods are closed
            distributeRevenueOnSpecificDate.distribute(undistributedRefund.number, today()).toDisjunction.leftMap(_.toString)
        }
      ).map((_: List[Unit]) => ())
    } yield ()
  }

  private def requiredRefundDistribution(revenueItems: List[RevenueItem]): Option[List[RevenueDistribution]] = {
    // "Revenue items are listed in ascending order by the accounting period start date."
    revenueItems.partition(_.isAccountingPeriodClosed) match {
      case (closed, open) =>
        val carryForward = closed.map(_.amountInPence).sum
        val directCopies = open.map {
          case RevenueItem(accountingPeriodName, _, amountInPence) =>
            RevenueDistribution(accountingPeriodName, 0 - amountInPence)
        }
        // partition appears to be stable, so we can add on the first open period
        directCopies match {
          case RevenueDistribution(accountingPeriodName, newAmountInPence) :: rest =>
            val amountIncludingCarry = newAmountInPence - carryForward
            Some(RevenueDistribution(accountingPeriodName, amountIncludingCarry) :: rest)
          case Nil =>
            // it's all already in closed periods
            None
        }
    }
  }

}
