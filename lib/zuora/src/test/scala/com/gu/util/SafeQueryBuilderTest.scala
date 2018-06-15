package com.gu.util

import com.gu.util.zuora.RestRequestMaker.{ClientFailableOp, GenericError}
import com.gu.util.zuora.SafeQueryBuilder.Implicits._
import com.gu.util.zuora.SafeQueryBuilder.{OrTraverse, SafeQuery}
import org.scalatest._
import scalaz.{-\/, \/-}

class SafeQueryBuilderEscapeTest extends FlatSpec with Matchers {

  it should "escape single quotes" in {
    val actual = makeSafeStringIntoQueryLiteral("""bobby tables'drop database students""")
    actual should be(\/-("""'bobby tables\'drop database students'"""))
  }

  it should "escape double quotes" in {
    val actual = makeSafeStringIntoQueryLiteral("""a very "nice" query""")
    actual should be(\/-("""'a very \"nice\" query'"""))
  }

  it should "escape backslashes" in {
    val actual = makeSafeStringIntoQueryLiteral("""a very \ query""")
    actual should be(\/-("""'a very \\ query'"""))
  }

  it should "escape single quotes double check the length" in {
    val actual = makeSafeStringIntoQueryLiteral("""'""")
    actual.map(_.length) should be(\/-(4))
  }

  it should "escape double quotes double check the length" in {
    val actual = makeSafeStringIntoQueryLiteral(""""""")
    actual.map(_.length) should be(\/-(4))
  }

  it should "escape backslash double check the length" in {
    val actual = makeSafeStringIntoQueryLiteral("""\""")
    actual.map(_.length) should be(\/-(4))
  }

  it should "reject control chars completely" in {
    val badChars = "\t\n\r\u007f\u0000".toCharArray.toList
    badChars.foreach { char =>
      val actual = makeSafeStringIntoQueryLiteral(s"hello${char}bye")
      actual.leftMap {
        case GenericError(mess) => mess.split(':')(0)
        case a => a
      } should be(-\/("control characters can't be inserted into a query"))
    }
  }

}

class SafeQueryBuilderApplyTest extends FlatSpec with Matchers {

  it should "assemble a whole query with no fanfare" in {
    val actual: ClientFailableOp[SafeQuery] = zoql"""field=${"hahaha"}"""
    actual.map(_.queryString) should be(\/-("""field='hahaha'"""))
  }

  it should "assemble a whole query apostrophe" in {
    val actual: ClientFailableOp[SafeQuery] = zoql"""field=${"o'leary"}"""
    actual.map(_.queryString) should be(\/-("""field='o\'leary'"""))
  }

  it should "assemble a whole query double quote" in {
    val actual: ClientFailableOp[SafeQuery] = zoql"""field=${"""o"leary"""}"""
    actual.map(_.queryString) should be(\/-("""field='o\"leary'"""))
  }

  it should "assemble a whole query backslash" in {
    val actual: ClientFailableOp[SafeQuery] = zoql"""field=${"""o\leary"""}"""
    actual.map(_.queryString) should be(\/-("""field='o\\leary'"""))
  }

  it should "use a List in insert clause" in {
    val ids = List("anna", "bill")
    val actual = for {
      insert <- OrTraverse(ids)({ id => zoql"""id = $id""" })
      wholeQuery <- zoql"""select hi from table where $insert"""
    } yield wholeQuery
    actual.map(_.queryString) should be(\/-("""select hi from table where id = 'anna' or id = 'bill'"""))
  }

  //POST query - SELECT Id, promotioncode__c FROM Subscription where PromotionCode__c = 'qwerty\"asdf\'zxcv\\1234'
  // NOTE for "zoql export" we don't escape anything, just double up on single quotes only. tested all june 2018

}
