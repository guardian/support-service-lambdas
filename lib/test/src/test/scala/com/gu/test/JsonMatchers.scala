package com.gu.test

import org.scalatest.Assertion
import play.api.libs.json._

import scala.util.{Failure, Success, Try}
import org.scalatest.matchers.should.Matchers

object JsonMatchers {

  implicit class JsonMatcher(private val actual: String) extends Matchers {

    def jsonMatchesFormat[FORMAT: OFormat](expected: FORMAT): Assertion = {
      val expectedJson: JsResult[WithoutExtras[FORMAT]] = JsSuccess(WithoutExtras(expected))
      val actualJson: JsResult[WithoutExtras[FORMAT]] = Json.parse(actual).validate[WithoutExtras[FORMAT]]
      withClue(actual) {
        actualJson should be(expectedJson)
      }
    }

  }

  /*
  This lets us model in case classes data types where there's a json object where one of the values is a string that
  itself contains serialised json.
  It will deserialise the json for the assertion in the test, ensuring that there
  are no extra fields while it's doing so.
   */
  case class JsStringContainingJson[CONTAINED](embeddedJsonType: CONTAINED)

  implicit def embeddedJsonWrites[CONTAINED: OFormat]: Writes[JsStringContainingJson[CONTAINED]] =
    (objectToWrite: JsStringContainingJson[CONTAINED]) =>
      JsString(Json.prettyPrint(Json.toJsObject(objectToWrite.embeddedJsonType)))

  implicit def embeddedJsonReads[CONTAINED: OFormat]: Reads[JsStringContainingJson[CONTAINED]] =
    (jsValueToRead: JsValue) =>
      for {
        stringContainingEmbeddedJson <- JsPath.read[String].reads(jsValueToRead)
        embeddedJsValue <- Try(Json.parse(stringContainingEmbeddedJson)) match {
          case Success(s) => JsSuccess(s)
          case Failure(t) => JsError(t.toString)
        }
        contained <- embeddedJsValue.validate[CONTAINED]
        containedWithoutExtraFields <- wrapContainedEnsuringNoExtras(embeddedJsValue, contained)
      } yield JsStringContainingJson(containedWithoutExtraFields)

  /*
  When this class wraps something, the deserialiser will refuse to deserialise if there are any fields
  that are not defined specifically.  This is mostly used internally by the matchers.
   */
  case class WithoutExtras[CONTAINED](contained: CONTAINED)

  implicit def withoutExtrasWrites[C: OFormat]: Writes[WithoutExtras[C]] =
    (objectToWrite: WithoutExtras[C]) => Json.toJson(objectToWrite.contained)

  implicit def withoutExtrasReads[CONTAINED: OFormat]: Reads[WithoutExtras[CONTAINED]] =
    (jsValueToRead: JsValue) =>
      for {
        contained <- implicitly[Reads[CONTAINED]].reads(jsValueToRead)
        containedWithoutExtraFields <- wrapContainedEnsuringNoExtras(jsValueToRead, contained)
      } yield WithoutExtras(containedWithoutExtraFields)

  def wrapContainedEnsuringNoExtras[CONTAINED: OFormat](jsValue: JsValue, contained: CONTAINED): JsResult[CONTAINED] = {
    val backToJsValue: JsValue = Json.toJsObject(contained)
    if (doesntHaveExtraFields(backToJsValue, jsValue))
      JsSuccess(contained)
    else
      JsError(s"extra fields, $backToJsValue == $jsValue")
  }

  def doesntHaveExtraFields: (JsValue, JsValue) => Boolean = {
    case (o1: JsObject, o2: JsObject) =>
      if (o1.keys == o2.keys) {
        // check what's inside
        val keysMatch = o1.keys.map { key =>
          (for {
            v1 <- o1.value.get(key)
            v2 <- o2.value.get(key)
          } yield doesntHaveExtraFields(v1, v2)).getOrElse(false /*won't happen*/ )
        }
        !keysMatch.contains(false)
      } else false
    case (s1: JsArray, s2: JsArray) => false // may need to check inside JsArray too later
    case (v1, v2) => true // don't care about the content, will be chceck by the normal equals
  }

}
