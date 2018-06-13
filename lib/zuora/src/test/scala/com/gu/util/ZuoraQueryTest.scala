package com.gu.util

import com.gu.util.zuora.ZuoraQuery.{Or, Query, SanitisedQuery}
import org.scalatest._

class WireQueryEscapeTest extends FlatSpec with Matchers {

  it should "escape signel quotes" in {
    val actual = SanitisedQuery.sanitise("""bobby tables'drop database students""")
    actual should be("""'bobby tables\'drop database students'""")
  }

  it should "escape double quotes" in {
    val actual = SanitisedQuery.sanitise("""a very "nice" query""")
    actual should be("""'a very \"nice\" query'""")
  }

  it should "escape backslashes" in {
    val actual = SanitisedQuery.sanitise("""a very \ query""")
    actual should be("""'a very \\ query'""")
  }

  it should "escape signel quotes double check the length" in {
    val actual = SanitisedQuery.sanitise("""'""")
    actual.length should be(4)
  }

  it should "escape double quotes double check the length" in {
    val actual = SanitisedQuery.sanitise(""""""")
    actual.length should be(4)
  }

  it should "escape backslasgh double check the length" in {
    val actual = SanitisedQuery.sanitise("""\""")
    actual.length should be(4)
  }

  it should "remove control chars - this is not 100% safe - we should reject completely" in {
    val actual = SanitisedQuery.sanitise("\t\n\rhello\u007f\u0000")
    actual should be("'hello'")
  }

}

class WireQueryApplyTest extends FlatSpec with Matchers {

  it should "assemble a whole query with no fanfare" in {
    val actual: SanitisedQuery = zoql"""field=${"hahaha"}"""
    actual.queryString should be("""field='hahaha'""")
  }

  it should "assemble a whole query apostrophe" in {
    val actual: SanitisedQuery = zoql"""field=${"o'leary"}"""
    actual.queryString should be("""field='o\'leary'""")
  }

  it should "assemble a whole query double quote" in {
    val actual: SanitisedQuery = zoql"""field=${"""o"leary"""}"""
    actual.queryString should be("""field='o\"leary'""")
  }

  it should "assemble a whole query backslash" in {
    val actual: SanitisedQuery = zoql"""field=${"""o\leary"""}"""
    actual.queryString should be("""field='o\\leary'""")
  }

  it should "use a List in insert clause" in {
    val ids = List("anna", "bill")
    val insert = Or(ids.map { id => zoql"""id = $id""" })
    val actual: SanitisedQuery = zoql"""select * from table where $insert"""
    actual.queryString should be("""select * from table where id = 'anna' or id = 'bill'""")
  }

  //POST query - SELECT Id, promotioncode__c FROM Subscription where PromotionCode__c = 'qwerty\"asdf\'zxcv\\1234'
  // NOTE for "zoql export" we don't escape anything, just double up on single quotes only. tested all june 2018

}
