package com.gu.zuora.subscription

import java.time.DayOfWeek

import com.gu.zuora.ZuoraProductTypes._

case class SupportedRatePlan(name: String, ratePlanCharges: List[SupportedRatePlanCharge])

case class SupportedRatePlanCharge(name: String, dayOfWeek: DayOfWeek)

case class SupportedProduct(
    name: String,
    productType: ZuoraProductType,
    annualIssueLimitPerEdition: Int,
    ratePlans: List[SupportedRatePlan],
)

object SupportedProduct {
  lazy val supportedProducts = List(
    // We need to add Tier Three into this list because it is the name of the product in Zuora (ratePlan.productName)
    // However for the purposes of the credit processing we are only concerned with the Guardian Weekly plan within it
    SupportedProduct(
      name = "Tier Three",
      productType =
        GuardianWeekly, // Guardian Weekly is included in Tier Three and is the product we are concerned with here
      annualIssueLimitPerEdition = 6,
      ratePlans = List(
        SupportedRatePlan(
          "Supporter Plus & Guardian Weekly Domestic - Monthly",
          List(SupportedRatePlanCharge("Guardian Weekly", DayOfWeek.FRIDAY)),
        ),
        SupportedRatePlan(
          "Supporter Plus & Guardian Weekly Domestic - Annual",
          List(SupportedRatePlanCharge("Guardian Weekly", DayOfWeek.FRIDAY)),
        ),
        SupportedRatePlan(
          "Supporter Plus & Guardian Weekly ROW - Monthly",
          List(SupportedRatePlanCharge("Guardian Weekly", DayOfWeek.FRIDAY)),
        ),
        SupportedRatePlan(
          "Supporter Plus & Guardian Weekly ROW - Annual",
          List(SupportedRatePlanCharge("Guardian Weekly", DayOfWeek.FRIDAY)),
        ),
      ),
    ),
    SupportedProduct(
      name = "Guardian Weekly - Domestic",
      productType = GuardianWeekly,
      annualIssueLimitPerEdition = 6,
      ratePlans = List(
        // Old names for GW gift subs
        SupportedRatePlan(
          "GW Oct 18 - 1 Year - Domestic",
          List(SupportedRatePlanCharge("GW Oct 18 - 1 Year - Domestic", DayOfWeek.FRIDAY)),
        ),
        SupportedRatePlan(
          "GW Oct 18 - 3 Month - Domestic",
          List(SupportedRatePlanCharge("GW Oct 18 - 3 Month - Domestic", DayOfWeek.FRIDAY)),
        ),
        // New names for GW gift subs
        SupportedRatePlan(
          "GW GIFT Oct 18 - 1 Year - Domestic",
          List(SupportedRatePlanCharge("GW GIFT Oct 18 - 1 Year - Domestic", DayOfWeek.FRIDAY)),
        ),
        SupportedRatePlan(
          "GW GIFT Oct 18 - 3 Month - Domestic",
          List(SupportedRatePlanCharge("GW GIFT Oct 18 - 3 Month - Domestic", DayOfWeek.FRIDAY)),
        ),
        SupportedRatePlan(
          "GW Oct 18 - Annual - Domestic",
          List(SupportedRatePlanCharge("GW Oct 18 - Annual - Domestic", DayOfWeek.FRIDAY)),
        ),
        SupportedRatePlan(
          "GW Oct 18 - Quarterly - Domestic",
          List(SupportedRatePlanCharge("GW Oct 18 - Quarterly - Domestic", DayOfWeek.FRIDAY)),
        ),
        SupportedRatePlan(
          "GW Oct 18 - Six for Six - Domestic",
          List(SupportedRatePlanCharge("GW Oct 18 - First 6 issues - Domestic", DayOfWeek.FRIDAY)),
        ),
        SupportedRatePlan(
          "GW Oct 18 - Monthly - Domestic",
          List(SupportedRatePlanCharge("GW Oct 18 - Monthly - Domestic", DayOfWeek.FRIDAY)),
        ),
      ),
    ),
    SupportedProduct(
      name = "Guardian Weekly - ROW",
      productType = GuardianWeekly,
      annualIssueLimitPerEdition = 6,
      ratePlans = List(
        // Old names for GW Gift rate plans
        SupportedRatePlan(
          "GW Oct 18 - 1 Year - ROW",
          List(SupportedRatePlanCharge("GW Oct 18 - 1 Year - ROW", DayOfWeek.FRIDAY)),
        ),
        SupportedRatePlan(
          "GW Oct 18 - 3 Month - ROW",
          List(SupportedRatePlanCharge("GW Oct 18 - 3 Month - ROW", DayOfWeek.FRIDAY)),
        ),
        // New names for GW Gift rate plans
        SupportedRatePlan(
          "GW GIFT Oct 18 - 1 Year - ROW",
          List(SupportedRatePlanCharge("GW GIFT Oct 18 - 1 Year - ROW", DayOfWeek.FRIDAY)),
        ),
        SupportedRatePlan(
          "GW GIFT Oct 18 - 3 Month - ROW",
          List(SupportedRatePlanCharge("GW GIFT Oct 18 - 3 Month - ROW", DayOfWeek.FRIDAY)),
        ),
        SupportedRatePlan(
          "GW Oct 18 - Annual - ROW",
          List(SupportedRatePlanCharge("GW Oct 18 - Annual - ROW", DayOfWeek.FRIDAY)),
        ),
        SupportedRatePlan(
          "GW Oct 18 - Quarterly - ROW",
          List(SupportedRatePlanCharge("GW Oct 18 - Quarterly - ROW", DayOfWeek.FRIDAY)),
        ),
        SupportedRatePlan(
          "GW Oct 18 - Six for Six - ROW",
          List(SupportedRatePlanCharge("GW Oct 18 - First 6 issues - ROW", DayOfWeek.FRIDAY)),
        ),
        SupportedRatePlan(
          "GW Oct 18 - Monthly - ROW",
          List(SupportedRatePlanCharge("GW Oct 18 - Monthly - ROW", DayOfWeek.FRIDAY)),
        ),
      ),
    ),
    SupportedProduct(
      name = "Guardian Weekly Zone A",
      productType = GuardianWeekly,
      annualIssueLimitPerEdition = 6,
      ratePlans = List(
        SupportedRatePlan("Guardian Weekly 1 Year", List(SupportedRatePlanCharge("Zone A 1 Year", DayOfWeek.FRIDAY))),
        SupportedRatePlan(
          "Guardian Weekly 12 Issues",
          List(SupportedRatePlanCharge("Zone A 12 Issues", DayOfWeek.FRIDAY)),
        ),
        SupportedRatePlan("Guardian Weekly 2 Years", List(SupportedRatePlanCharge("Zone A 2 Years", DayOfWeek.FRIDAY))),
        SupportedRatePlan("Guardian Weekly 3 Years", List(SupportedRatePlanCharge("Zone A 3 Years", DayOfWeek.FRIDAY))),
        SupportedRatePlan(
          "Guardian Weekly 6 Issues",
          List(SupportedRatePlanCharge("Zone A 6 Issues", DayOfWeek.FRIDAY)),
        ),
        SupportedRatePlan(
          "Guardian Weekly 6 Months",
          List(SupportedRatePlanCharge("Zone A 6 Months", DayOfWeek.FRIDAY)),
        ),
        SupportedRatePlan(
          "Guardian Weekly 6 Months Only",
          List(SupportedRatePlanCharge("Zone A 6 Months", DayOfWeek.FRIDAY)),
        ),
        SupportedRatePlan("Guardian Weekly Annual", List(SupportedRatePlanCharge("Zone A Annual", DayOfWeek.FRIDAY))),
        SupportedRatePlan(
          "Guardian Weekly Quarterly",
          List(SupportedRatePlanCharge("Zone A Quarterly", DayOfWeek.FRIDAY)),
        ),
      ),
    ),
    SupportedProduct(
      name = "Guardian Weekly Zone B",
      productType = GuardianWeekly,
      annualIssueLimitPerEdition = 6,
      ratePlans = List(
        SupportedRatePlan("Guardian Weekly 1 Year", List(SupportedRatePlanCharge("Zone B 1 Year", DayOfWeek.FRIDAY))),
        SupportedRatePlan(
          "Guardian Weekly 12 Issues",
          List(SupportedRatePlanCharge("Zone B 12 Issues", DayOfWeek.FRIDAY)),
        ),
        SupportedRatePlan("Guardian Weekly 2 Years", List(SupportedRatePlanCharge("Zone B 2 Years", DayOfWeek.FRIDAY))),
        SupportedRatePlan("Guardian Weekly 3 Years", List(SupportedRatePlanCharge("Zone B 3 Years", DayOfWeek.FRIDAY))),
        SupportedRatePlan(
          "Guardian Weekly 6 Issues",
          List(SupportedRatePlanCharge("Zone B 6 Issues", DayOfWeek.FRIDAY)),
        ),
        SupportedRatePlan(
          "Guardian Weekly 6 Months",
          List(SupportedRatePlanCharge("Zone B 6 Months", DayOfWeek.FRIDAY)),
        ),
        SupportedRatePlan(
          "Guardian Weekly 6 Months Only",
          List(SupportedRatePlanCharge("Zone B 6 Months", DayOfWeek.FRIDAY)),
        ),
        SupportedRatePlan("Guardian Weekly Annual", List(SupportedRatePlanCharge("Zone B Annual", DayOfWeek.FRIDAY))),
        SupportedRatePlan(
          "Guardian Weekly Quarterly",
          List(SupportedRatePlanCharge("Zone B Quarterly", DayOfWeek.FRIDAY)),
        ),
      ),
    ),
    SupportedProduct(
      name = "Guardian Weekly Zone C",
      productType = GuardianWeekly,
      annualIssueLimitPerEdition = 6,
      ratePlans = List(
        SupportedRatePlan("Guardian Weekly 1 Year", List(SupportedRatePlanCharge("Zone C 1 Year", DayOfWeek.FRIDAY))),
        SupportedRatePlan(
          "Guardian Weekly 12 Issues",
          List(SupportedRatePlanCharge("Guardian Weekly 12 Issues", DayOfWeek.FRIDAY)),
        ),
        SupportedRatePlan(
          "Guardian Weekly 6 Issues",
          List(SupportedRatePlanCharge("Guardian Weekly 6 Issues", DayOfWeek.FRIDAY)),
        ),
        SupportedRatePlan(
          "Guardian Weekly 6 Months",
          List(SupportedRatePlanCharge("Zone C 6 Months", DayOfWeek.FRIDAY)),
        ),
        SupportedRatePlan(
          "Guardian Weekly 6 Months Only",
          List(SupportedRatePlanCharge("Zone C 6 Months", DayOfWeek.FRIDAY)),
        ),
        SupportedRatePlan("Guardian Weekly Annual", List(SupportedRatePlanCharge("Zone C Annual", DayOfWeek.FRIDAY))),
        SupportedRatePlan(
          "Guardian Weekly Quarterly",
          List(SupportedRatePlanCharge("Zone C Quarterly", DayOfWeek.FRIDAY)),
        ),
      ),
    ),
    SupportedProduct(
      name = "Newspaper Delivery",
      productType = NewspaperHomeDelivery,
      annualIssueLimitPerEdition = 5,
      ratePlans = List(
        SupportedRatePlan("Echo-Legacy", everyDayCharges),
        SupportedRatePlan("Everyday", everyDayCharges),
        SupportedRatePlan("Everyday+", everyDayCharges),
        SupportedRatePlan("Fiveday", fiveDayCharges),
        SupportedRatePlan("Multi-day", everyDayCharges),
        SupportedRatePlan("Saturday ", saturdayCharges),
        SupportedRatePlan("Saturday", saturdayCharges), // Some do not have whitespace
        SupportedRatePlan("Saturday+", saturdayCharges),
        SupportedRatePlan("Sixday", sixDayCharges),
        SupportedRatePlan("Sixday+", sixDayCharges),
        SupportedRatePlan("Sunday", sundayCharges),
        SupportedRatePlan("Sunday+", sundayCharges),
        SupportedRatePlan("Weekend", weekendCharges),
        SupportedRatePlan("Weekend+", weekendCharges),
      ),
    ),
    SupportedProduct(
      name = "Newspaper Voucher",
      productType = NewspaperVoucherBook,
      annualIssueLimitPerEdition = 5,
      ratePlans = List(
        SupportedRatePlan("Everyday", everyDayCharges),
        SupportedRatePlan("Everyday+", everyDayCharges),
        SupportedRatePlan("Saturday", saturdayCharges),
        SupportedRatePlan("Saturday+", saturdayCharges),
        SupportedRatePlan("Sixday", sixDayCharges),
        SupportedRatePlan("Sixday+", sixDayCharges),
        SupportedRatePlan("Sunday", sundayCharges),
        SupportedRatePlan("Sunday+", sundayCharges),
        SupportedRatePlan("Weekend", weekendCharges),
        SupportedRatePlan("Weekend+", weekendCharges),
      ),
    ),
    SupportedProduct(
      name = "Newspaper Digital Voucher",
      productType = NewspaperDigitalVoucher,
      annualIssueLimitPerEdition = 5,
      ratePlans = List(
        SupportedRatePlan("Everyday", everyDayCharges),
        SupportedRatePlan("Everyday+", everyDayCharges),
        SupportedRatePlan("Saturday", saturdayCharges),
        SupportedRatePlan("Saturday+", saturdayCharges),
        SupportedRatePlan("Sixday", sixDayCharges),
        SupportedRatePlan("Sixday+", sixDayCharges),
        SupportedRatePlan("Sunday", sundayCharges),
        SupportedRatePlan("Sunday+", sundayCharges),
        SupportedRatePlan("Weekend", weekendCharges),
        SupportedRatePlan("Weekend+", weekendCharges),
      ),
    ),
    SupportedProduct(
      name = "Newspaper - National Delivery",
      productType = NewspaperNationalDelivery,
      annualIssueLimitPerEdition = 5,
      ratePlans = List(
        SupportedRatePlan("Weekend", weekendCharges),
        SupportedRatePlan("Weekend+", weekendCharges),
        SupportedRatePlan("Everyday", everyDayCharges),
        SupportedRatePlan("Everyday+", everyDayCharges),
        SupportedRatePlan("Sixday", sixDayCharges),
        SupportedRatePlan("Sixday+", sixDayCharges),
      ),
    ),
  )

  lazy private val everyDayCharges = List(
    SupportedRatePlanCharge("Monday", DayOfWeek.MONDAY),
    SupportedRatePlanCharge("Tuesday", DayOfWeek.TUESDAY),
    SupportedRatePlanCharge("Wednesday", DayOfWeek.WEDNESDAY),
    SupportedRatePlanCharge("Thursday", DayOfWeek.THURSDAY),
    SupportedRatePlanCharge("Friday", DayOfWeek.FRIDAY),
    SupportedRatePlanCharge("Saturday", DayOfWeek.SATURDAY),
    SupportedRatePlanCharge("Sunday", DayOfWeek.SUNDAY),
  )

  lazy private val fiveDayCharges = List(
    SupportedRatePlanCharge("Monday", DayOfWeek.MONDAY),
    SupportedRatePlanCharge("Tuesday", DayOfWeek.TUESDAY),
    SupportedRatePlanCharge("Wednesday", DayOfWeek.WEDNESDAY),
    SupportedRatePlanCharge("Thursday", DayOfWeek.THURSDAY),
    SupportedRatePlanCharge("Friday", DayOfWeek.FRIDAY),
  )

  lazy private val saturdayCharges = List(
    SupportedRatePlanCharge("Saturday", DayOfWeek.SATURDAY),
  )

  lazy private val sixDayCharges = List(
    SupportedRatePlanCharge("Monday", DayOfWeek.MONDAY),
    SupportedRatePlanCharge("Tuesday", DayOfWeek.TUESDAY),
    SupportedRatePlanCharge("Wednesday", DayOfWeek.WEDNESDAY),
    SupportedRatePlanCharge("Thursday", DayOfWeek.THURSDAY),
    SupportedRatePlanCharge("Friday", DayOfWeek.FRIDAY),
    SupportedRatePlanCharge("Saturday", DayOfWeek.SATURDAY),
  )

  lazy private val weekendCharges = List(
    SupportedRatePlanCharge("Saturday", DayOfWeek.SATURDAY),
    SupportedRatePlanCharge("Sunday", DayOfWeek.SUNDAY),
  )

  lazy private val sundayCharges = List(SupportedRatePlanCharge("Sunday", DayOfWeek.SUNDAY))
}
