package com.gu.newproduct.api.productcatalog

import java.time.LocalDate

object RuleFixtures {
  val testStartDateRules = StartDateRules(
    None,
    WindowRule(LocalDate.of(2020, 1, 1), None),
  )
}
