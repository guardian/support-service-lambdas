package com.gu.holidaystopbackfill

import java.time.LocalDate

object Queries {

  def preexistingHolidayStopQuery(startThreshold: LocalDate, endThreshold: LocalDate): String = s"""
      | select s.name subscriptionName, c.chargeNumber, c.holidaystart__c startDate,
      |   c.holidayend__c endDate, t.price creditPrice
      | from rateplanchargetier t
      | join rateplancharge c on t.rateplanchargeid = c.id
      | join rateplan p on c.rateplanid = p.id
      | join subscription s on p.subscriptionid = s.id
      | where c.name = 'Holiday Credit'
      | and c.holidaystart__c >= '${startThreshold.toString}'
      | and c.holidaystart__c <= '${endThreshold.toString}'
      | and p.name = 'Guardian Weekly Holiday Credit'
      | order by s.name, c.chargenumber
      """.stripMargin
}
