package com.gu.zuora.retention

import org.scalatest.{FlatSpec, Matchers}

class DiffTest extends FlatSpec with Matchers {

  it should "should exclude crmIds" in {
    val candidates =
      """Account.Id,Account.CrmId,BillToContact.Id,SoldToContact.Id
        |11,A,13,14
        |21,C,23,24
        |31,D,33,34
        |41,F,43,44
        |51,Z,54,54
    """.stripMargin

    val excluded =
      """Account.CrmId
        |A
        |F
        |Z
      """.stripMargin

    val expected =
      """Account.Id,Account.CrmId,BillToContact.Id,SoldToContact.Id
        |21,C,23,24
        |31,D,33,34""".stripMargin

    Diff(candidates.lines, excluded.lines).mkString("\n") shouldBe expected
  }

  it should "should correctly exclude crmIds even if the input has duplicate values" in {
    val candidates =
      """Account.Id,Account.CrmId,BillToContact.Id,SoldToContact.Id
        |11,A_duplicate,13,14
        |11,A_duplicate,13,14
        |21,C,23,24
        |31,E_duplicate,33,34
        |31,E_duplicate,33,34
        |41,F,43,44
        |51,G,54,54
      """.stripMargin

    val excluded =
      """Account.CrmId
        |A_duplicate
        |F
        |G
      """.stripMargin

    val expected =
      """Account.Id,Account.CrmId,BillToContact.Id,SoldToContact.Id
        |21,C,23,24
        |31,E_duplicate,33,34
        |31,E_duplicate,33,34""".stripMargin

    Diff(candidates.lines, excluded.lines).mkString("\n") shouldBe expected
  }

  it should "should not exclude anything with an empty exclusion list " in {
    val candidates =
      """Account.Id,Account.CrmId,BillToContact.Id,SoldToContact.Id
        |11,B,13,14
        |21,E,23,24
        |31,G,33,34
        |41,H,43,44
        |51,L,54,54
      """.stripMargin

    val excluded =
      """Account.CrmId
      """.stripMargin

    val expected =
      """Account.Id,Account.CrmId,BillToContact.Id,SoldToContact.Id
        |11,B,13,14
        |21,E,23,24
        |31,G,33,34
        |41,H,43,44
        |51,L,54,54""".stripMargin

    Diff(candidates.lines, excluded.lines).mkString("\n") shouldBe expected
  }

  it should "should return empty with no candidates " in {
    val candidates =
      """Account.Id,Account.CrmId,BillToContact.Id,SoldToContact.Id
      """.stripMargin

    val excluded =
      """Account.CrmId
        |B
        |H
        |L
      """.stripMargin

    val expected =
      """Account.Id,Account.CrmId,BillToContact.Id,SoldToContact.Id""".stripMargin

    Diff(candidates.lines, excluded.lines).mkString("\n") shouldBe expected
  }
  it should "not skip ahead when ascii sorting differs from zuora order" in {
    val candidates =
      """Account.CrmId
        |6
        |a_lowercase
        |Z_uppercase
        |R
        |""".stripMargin

    val excluded =
      """Account.CrmId
        |6
        |Z_uppercase
        |0
      """.stripMargin

    val expected =
      """Account.CrmId
        |a_lowercase
        |R""".stripMargin

    Diff(candidates.lines, excluded.lines).mkString("\n") shouldBe expected
  }

  it should "not exclude candidates with no crmId" in {
    val candidates =
      """Account.Id,Account.CrmId
        |NoCrmId_Account,
        |excludedAccount,B
        |includedAccount,C""".stripMargin

    val excluded =
      """Account.CrmId
        |B
        |0
        """.stripMargin

    val expected =
      """Account.Id,Account.CrmId
        |NoCrmId_Account,
        |includedAccount,C""".stripMargin

    Diff(candidates.lines, excluded.lines).mkString("\n") shouldBe expected
  }
}

