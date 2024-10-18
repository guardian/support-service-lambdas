package com.gu.soft_opt_in_consent_setter.testData

import com.gu.soft_opt_in_consent_setter.models.ConsentsMapping

object ConsentsCalculatorTestData {
  val membershipMapping: Set[String] = ConsentsMapping.consentsMapping("Membership")
  val contributionMapping: Set[String] = ConsentsMapping.consentsMapping("Contribution")
  val supporterPlusMapping: Set[String] = ConsentsMapping.consentsMapping("Supporter Plus")
  val newspaperMapping: Set[String] = ConsentsMapping.consentsMapping("newspaper")
  val guWeeklyMapping: Set[String] = ConsentsMapping.consentsMapping("Guardian Weekly")
}
