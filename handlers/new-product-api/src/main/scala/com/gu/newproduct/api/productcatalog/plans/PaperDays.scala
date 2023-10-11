package com.gu.newproduct.api.productcatalog.plans

import java.time.DayOfWeek
import java.time.DayOfWeek._

private[plans] object PaperDays {

  val saturdayDays: List[DayOfWeek] = List(SATURDAY)
  val sundayDays: List[DayOfWeek] = List(SUNDAY)
  val weekendDays: List[DayOfWeek] = List(SATURDAY, SUNDAY)
  val weekDays: List[DayOfWeek] = List(
    MONDAY,
    TUESDAY,
    WEDNESDAY,
    THURSDAY,
    FRIDAY,
  )
  val sixDayDays: List[DayOfWeek] = weekDays ++ saturdayDays
  val everyDayDays: List[DayOfWeek] = List(MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY, SUNDAY)

}
