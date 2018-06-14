package com.gu.zuora.retention

import org.scalatest.AsyncFlatSpec

import org.scalatest.Matchers._

class DiffTest extends AsyncFlatSpec {

  it should "should exclude crmIds" in {
    val candidates =
      """Account.Id,Account.CrmId,BillToContact.Id,SoldToContact.Id
        |11,crmId1,13,14
        |21,crmId2,23,24
        |31,crmId3,33,34
        |41,crmId4,43,44
        |51,crmId5,54,54
    """.stripMargin

    val excluded =
      """Account.CrmId
        |crmId1
        |crmId4
        |crmId5
      """.stripMargin

    val expected =
      """Account.Id,Account.CrmId,BillToContact.Id,SoldToContact.Id
        |21,crmId2,23,24
        |31,crmId3,33,34""".stripMargin

    Diff(candidates.lines, excluded.lines).mkString("\n") shouldBe expected
  }

  it should "should correctly exclude crmIds even if the input has duplicate values" in {
    val candidates =
      """Account.Id,Account.CrmId,BillToContact.Id,SoldToContact.Id
        |11,crmId1,13,14
        |11,crmId1,13,14
        |11,crmId1,13,14
        |11,crmId1,13,14
        |21,crmId2,23,24
        |31,crmId3,33,34
        |31,crmId3,33,34
        |31,crmId3,33,34
        |41,crmId4,43,44
        |51,crmId5,54,54
      """.stripMargin

    val excluded =
      """Account.CrmId
        |crmId1
        |crmId4
        |crmId5
      """.stripMargin

    val expected =
      """Account.Id,Account.CrmId,BillToContact.Id,SoldToContact.Id
        |21,crmId2,23,24
        |31,crmId3,33,34
        |31,crmId3,33,34
        |31,crmId3,33,34""".stripMargin

    Diff(candidates.lines, excluded.lines).mkString("\n") shouldBe expected
  }

  it should "should exclude crmIds with upper and lower " in {
    val candidates =
      """Account.Id,Account.CrmId,BillToContact.Id,SoldToContact.Id
        |11,crmId1,13,14
        |21,crmId2,23,24
        |31,crmId3,33,34
        |41,crmId4,43,44
        |51,crmId5,54,54
      """.stripMargin

    val excluded =
      """Account.CrmId
        |crmId1
        |crmId4
        |crmId5
      """.stripMargin

    val expected =
      """Account.Id,Account.CrmId,BillToContact.Id,SoldToContact.Id
        |21,crmId2,23,24
        |31,crmId3,33,34""".stripMargin

    Diff(candidates.lines, excluded.lines).mkString("\n") shouldBe expected
  }

  it should "should not exclude anything with an empty exclusion list " in {
    val candidates =
      """Account.Id,Account.CrmId,BillToContact.Id,SoldToContact.Id
        |11,crmId1,13,14
        |21,crmId2,23,24
        |31,crmId3,33,34
        |41,crmId4,43,44
        |51,crmId5,54,54
      """.stripMargin

    val excluded =
      """Account.CrmId
      """.stripMargin

    val expected =
      """Account.Id,Account.CrmId,BillToContact.Id,SoldToContact.Id
        |11,crmId1,13,14
        |21,crmId2,23,24
        |31,crmId3,33,34
        |41,crmId4,43,44
        |51,crmId5,54,54""".stripMargin

    Diff(candidates.lines, excluded.lines).mkString("\n") shouldBe expected
  }

  it should "should return empty with no candidates " in {
    val candidates =
      """Account.Id,Account.CrmId,BillToContact.Id,SoldToContact.Id
      """.stripMargin

    val excluded =
      """Account.CrmId
        |crmId1
        |crmId4
        |crmId5
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
}

