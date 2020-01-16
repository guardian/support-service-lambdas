import java.time.LocalDate

import com.github.tototoshi.csv.CSVReader
import com.gu.holiday_stops.subscription.{RatePlanChargeBillingSchedule, SubscriptionData}

object Main extends App {
  val fileName = args(0)

  val reader = CSVReader.open(fileName)

  val records: Iterator[Map[String, String]] = reader.iteratorWithHeaders

  while(records.hasNext) {
    val recordsForSubs: List[Map[String, String]] = readRecordsForSub(records)
    checkInvoiceDates(recordsForSubs)
  }

  def readRecordsForSub(records: Iterator[Map[String, String]]) = {
    val firstRecord = records.next()
    firstRecord ::
      records.takeWhile { record =>
        (record("Subscription.Name") == firstRecord("Subscription.Name")) &&
        (record("RatePlanCharge.Name") == firstRecord("RatePlanCharge.Name"))
      }.toList
  }

  def checkInvoiceDates(recordsForSub: List[Map[String, String]]) = {
    val allInvoiceDates = recordsForSub.map(record => LocalDate.parse(record("Invoice.InvoiceDate")))
    val shouldUseEffectiveStartDate = recordsForSub.exists( record =>
      SubscriptionData.shouldUseEffectiveStartDate(
        record.apply("RatePlanCharge.Name"),
        Option(record("RatePlanCharge.UpToPeriodsType")).filter(_ != ""),
        Option(record("RatePlanCharge.BillingPeriod")).filter(_ != ""),
        Option(record("RatePlanCharge.SpecificBillingPeriod")).filter(_ != "").map(_.toInt)
      )
    )

    recordsForSub.foreach { record =>
      val id = s"${record("Subscription.Name")}-${record("Invoice.InvoiceNumber")}"

      RatePlanChargeBillingSchedule(
        LocalDate.parse(record("Subscription.ContractAcceptanceDate")),
        LocalDate.parse(record("Subscription.ContractEffectiveDate")),
        Option(record("RatePlanCharge.BillCycleType")).filter(_ != ""),
        Option(record("RatePlanCharge.TriggerEvent")).filter(_ != ""),
        Option(record("RatePlanCharge.TriggerDate")).filter(_ != "").map(LocalDate.parse),
        None,
        record("Account.BillCycleDay").toInt,
        Option(record("RatePlanCharge.UpToPeriodsType")).filter(_ != ""),
        Option(record("RatePlanCharge.UpToPeriods")).filter(_ != "").map(_.toInt),
        Option(record("RatePlanCharge.BillingPeriod")).filter(_ != ""),
        Option(record("RatePlanCharge.SpecificBillingPeriod")).filter(_ != "").map(_.toInt),
        Option(record("RatePlanCharge.EndDateCondition")).filter(_ != ""), //TODO: add to datalake table
        shouldUseEffectiveStartDate,
        LocalDate.parse(record("RatePlanCharge.EffectiveStartDate"))
      ).fold(
        error => println(s"Failed to generate schedule for $id: $error"),
        { schedule =>
          val invoiceDate = LocalDate.parse(record("Invoice.InvoiceDate"))
          schedule.billDatesCoveringDate(invoiceDate).fold(
            { error => println(s"Could not get billing period for $id for date $invoiceDate shouldUseEffectiveStartDate=$shouldUseEffectiveStartDate: $error") },
            { billDates =>
              if (!allInvoiceDates.contains(billDates.startDate)) {
                s"$id had invoices on dates $allInvoiceDates which did not include the bill dates calculated for date $invoiceDate: $billDates"
              }
            }
          )
        }
      )
    }
  }
}
