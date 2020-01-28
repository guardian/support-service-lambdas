import java.time.LocalDate

import com.github.tototoshi.csv.CSVReader
import com.gu.zuora.subscription.{RatePlanChargeBillingSchedule, ZuoraApiFailure}

import scala.collection.mutable
import cats.implicits._

object CheckHolidayStopStartDate extends App {
  type ZuoraApiResult[A] = Either[ZuoraApiFailure, A]
  val fileName = args(0)

  val reader = CSVReader.open(fileName)

  val records: Iterator[Map[String, String]] = reader.iteratorWithHeaders

  var currentSub: Option[String] = None
  var currentRecords = mutable.Buffer[Map[String, String]]()

  records.foreach { record =>
    val subName = record("Subscription.Name")

    if (currentSub == Some(subName)) {
      currentRecords.append(record)
    } else {
      if (currentSub != None) {
        checkHolidayStopDates(currentRecords.toList)
      }
      currentSub = Some(subName)
      currentRecords = mutable.Buffer[Map[String, String]]()
      currentRecords.append(record)
    }
  }

  def checkHolidayStopDates(recordsForSub: List[Map[String, String]]) = {
    recordsForSub
      .filter(record =>
        (record.get("RatePlanCharge.Name") == Some("Holiday Credit")) &&
          (record.get("RatePlan.Name") == Some("DO NOT USE MANUALLY: Holiday Credit - automated")))
      .toNel
      .map { holidayCreditRecords =>
        val id = s"${holidayCreditRecords.head("Subscription.Name")}"

        val billingScheduleRecords = recordsForSub
          .filter { record =>
            record.get("RatePlan.AmendmentType") != Some("RemoveProduct") &&
              record.get("RatePlanCharge.Name") != Some("Holiday Credit")
          } //Filter out removed rateplans
        val billingSchedules = billingScheduleRecords
          .map { record =>
            RatePlanChargeBillingSchedule(
              LocalDate.parse(record("Subscription.ContractAcceptanceDate")),
              LocalDate.parse(record("Subscription.ContractEffectiveDate")),
              Option(record("RatePlanCharge.BillCycleType")).filter(_ != ""),
              Option(record("RatePlanCharge.TriggerEvent")).filter(_ != ""),
              Option(record("RatePlanCharge.TriggerDate")).filter(_ != "").map(LocalDate.parse),
              Option(record("RatePlanCharge.ProcessedThroughDate")).filter(_ != "").map(LocalDate.parse),
              Option(record("RatePlanCharge.ChargedThroughDate")).filter(_ != "").map(LocalDate.parse),
              record("Account.BillCycleDay").toInt,
              Option(record("RatePlanCharge.UpToPeriodsType")).filter(_ != ""),
              Option(record("RatePlanCharge.UpToPeriods")).filter(_ != "").map(_.toInt),
              Option(record("RatePlanCharge.BillingPeriod")).filter(_ != ""),
              Option(record("RatePlanCharge.SpecificBillingPeriod")).filter(_ != "").map(_.toInt),
              Option(record("RatePlanCharge.EndDateCondition")).filter(_ != ""),
              LocalDate.parse(record("RatePlanCharge.EffectiveStartDate"))
            )
          }
          .collect {
            case Right(schedule) => schedule
          }

        holidayCreditRecords.map { holidayCreditRecord =>
          val effectiveStartDate = LocalDate.parse(holidayCreditRecord("RatePlanCharge.EffectiveStartDate"))

          if (!billingSchedules.exists { billingSchedule =>
            billingSchedule
              .billDatesCoveringDate(effectiveStartDate)
              .toOption
              .exists(_.startDate == effectiveStartDate)
          }) {
            println(s"Subscription $id has holiday stop with invalid effectiveStartDate of $effectiveStartDate: ${billingScheduleRecords.size} ${recordsForSub.size} ")
          } else {
            //println(s"Subscription $id has valid holiday credit")
          }
        }
      }
  }
}
