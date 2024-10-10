package com.gu.util

import com.gu.util.resthttp.Types.{ClientFailableOp, ClientSuccess, GenericError}
import com.gu.util.zuora.SafeQueryBuilder.Implicits._
import com.gu.util.zuora.SafeQueryBuilder.{OrTraverse, SafeQuery}
import org.scalatest._
import cats.data.NonEmptyList
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class SafeQueryBuilderEscapeTest extends AnyFlatSpec with Matchers {

  it should "escape single quotes" in {
    val actual = makeSafeStringIntoQueryLiteral("""bobby tables'drop database students""")
    actual should be(ClientSuccess("""'bobby tables\'drop database students'"""))
  }

  it should "escape double quotes" in {
    val actual = makeSafeStringIntoQueryLiteral("""a very "nice" query""")
    actual should be(ClientSuccess("""'a very \"nice\" query'"""))
  }

  it should "escape backslashes" in {
    val actual = makeSafeStringIntoQueryLiteral("""a very \ query""")
    actual should be(ClientSuccess("""'a very \\ query'"""))
  }

  it should "escape single quotes double check the length" in {
    val actual = makeSafeStringIntoQueryLiteral("""'""")
    actual.map(_.length) should be(ClientSuccess(4))
  }

  it should "escape double quotes double check the length" in {
    val actual = makeSafeStringIntoQueryLiteral(""""""")
    actual.map(_.length) should be(ClientSuccess(4))
  }

  it should "escape backslash double check the length" in {
    val actual = makeSafeStringIntoQueryLiteral("""\""")
    actual.map(_.length) should be(ClientSuccess(4))
  }

  it should "reject control chars completely" in {
    val badChars = "\t\n\r\u007f\u0000".toCharArray.toList
    badChars.foreach { char =>
      val actual = makeSafeStringIntoQueryLiteral(s"hello${char}bye")
      actual.toDisjunction.left.map {
        case GenericError(mess, _) => mess.split(':')(0)
        case a => a
      } should be(Left("control characters can't be inserted into a query"))
    }
  }

}

class SafeQueryBuilderApplyTest extends AnyFlatSpec with Matchers {

  it should "assemble a whole query with no fanfare" in {
    val actual: ClientFailableOp[SafeQuery] = zoql"""field=${"hahaha"}"""
    actual.map(_.queryString) should be(ClientSuccess("""field='hahaha'"""))
  }

  it should "assemble a whole query apostrophe" in {
    val actual: ClientFailableOp[SafeQuery] = zoql"""field=${"o'leary"}"""
    actual.map(_.queryString) should be(ClientSuccess("""field='o\'leary'"""))
  }

  it should "assemble a whole query double quote" in {
    val actual: ClientFailableOp[SafeQuery] = zoql"""field=${"""o"leary"""}"""
    actual.map(_.queryString) should be(ClientSuccess("""field='o\"leary'"""))
  }

  it should "assemble a whole query backslash" in {
    val actual: ClientFailableOp[SafeQuery] = zoql"""field=${"""o\leary"""}"""
    actual.map(_.queryString) should be(ClientSuccess("""field='o\\leary'"""))
  }

  it should "use a List in insert clause" in {
    val ids = NonEmptyList("anna", List("bill"))
    val actual = for {
      insert <- OrTraverse(ids)({ id => zoql"""id = $id""" })
      wholeQuery <- zoql"""select hi from table where $insert"""
    } yield wholeQuery
    actual.map(_.queryString) should be(ClientSuccess("""select hi from table where id = 'anna' or id = 'bill'"""))
  }

}
