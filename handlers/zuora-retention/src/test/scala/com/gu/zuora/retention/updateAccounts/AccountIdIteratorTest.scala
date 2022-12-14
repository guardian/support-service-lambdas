package com.gu.zuora.retention.updateAccounts

import com.gu.util.handlers.LambdaException

import scala.util.{Failure, Success}
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class AccountIdIteratorTest extends AnyFlatSpec with Matchers {

  def linesIterator(data: String) = data.split("\n").iterator
  def errorResponse(msg: String) = Failure(LambdaException(msg))

  it should "return account id from the correct file column" in {
    val csvData =
      """SomeCol,Account.Id, SomeOtherCol
        |A1,AccountId1,C1
        |A2,AccountId2,C2
        |A3,AccountId3,C2
      """.stripMargin

    AccountIdIterator(linesIterator(csvData), 0).map(_.next) shouldBe Success(AccountId("AccountId1"))
  }

  it should "return error if no account id column in header" in {
    val noAccountIdData =
      """col1, col2, col3
        |data1,data2,data3
      """.stripMargin

    AccountIdIterator(linesIterator(noAccountIdData), 0) shouldBe errorResponse(
      "No Account.Id column found in csv file header",
    )
  }

  it should "skip to the correct starting position" in {
    val csvData =
      """Account.Id
        |Line_0
        |Line_1
        |Line_2
        |Line_3""".stripMargin

    AccountIdIterator(linesIterator(csvData), 2).map(_.next) shouldBe Success(AccountId("Line_2"))
  }

  it should "hasNext should return false if starting position is past the end of the csv file" in {
    val csvData =
      """Account.Id
        |Line_0
        |Line_1
        |Line_2
        |Line_3""".stripMargin

    AccountIdIterator(linesIterator(csvData), 10).map(_.hasNext).shouldBe(Success(false))
  }

  it should "iterate through all lines of the file" in {
    val csvData =
      """Account.Id
        |Line_0
        |Line_1
        |Line_2
        |Line_3""".stripMargin

    AccountIdIterator(linesIterator(csvData), 0).map(getAllAccounts) shouldBe Success(
      List("Line_0", "Line_1", "Line_2", "Line_3"),
    )

    def getAllAccounts(iterator: AccountIdIterator): List[String] = {
      def appendNextId(): List[String] = {
        if (!iterator.hasNext)
          List.empty
        else
          iterator.next.value :: appendNextId()
      }
      appendNextId()
    }
  }
}
