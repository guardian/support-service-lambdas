package com.gu.sfContactMerge

import org.scalatest.{Assertion, Matchers}
import play.api.libs.json._

object JsonMatchers {

  implicit class JsonMatcher(private val actual: String) extends Matchers {

    def jsonMatches[C: OFormat](expected: C): Assertion = {
      val expectedJson: JsResult[WithoutExtras[C]] = JsSuccess(WithoutExtras(expected))
      val actualJson: JsResult[WithoutExtras[C]] = Json.parse(actual).validate[WithoutExtras[C]]
      actualJson should be(expectedJson)
    }

  }

  case class JsEmbedded[C](c: C)

  implicit def eW[C: OFormat]: Writes[JsEmbedded[C]] = (o: JsEmbedded[C]) =>
    JsString(Json.prettyPrint(Json.toJsObject(o.c)))

  implicit def eR[C: OFormat]: Reads[JsEmbedded[C]] = (jsValue: JsValue) =>
    JsPath.read[String].reads(jsValue).flatMap { stringContainingEmbeddedJson =>
      val jsValue = Json.parse(stringContainingEmbeddedJson)
      val maybeC = jsValue.validate[C]
      val withExtrasCheck = maybeC.flatMap { c =>
        val backToJsValue: JsValue = Json.toJsObject(c)
        if (sameStructure(backToJsValue, jsValue))
          JsSuccess(c)
        else JsError(s"extra fields, $backToJsValue == $jsValue")
      }
      withExtrasCheck.map(c => JsEmbedded(c))
    }

  def sameStructure: (JsValue, JsValue) => Boolean = {
    case (o1: JsObject, o2: JsObject) =>
      if (o1.keys == o2.keys) {
        // check what's inside
        val keysMatch = o1.keys.map { key =>
          (for {
            v1 <- o1.value.get(key)
            v2 <- o2.value.get(key)
          } yield sameStructure(v1, v2)).getOrElse(false /*won't happen*/ )
        }
        println(s"keysMatch $keysMatch")
        !keysMatch.contains(false)
      } else false
    case (s1: JsArray, s2: JsArray) => false // may need to check inside JsArray too later
    case (v1, v2) => true //don't care about the content, will be chceck by the normal equals
  }

  /*
  This class wraps a class so that when we deserialise json into the object contained, it will ensure no extra fields whatsoever
   */
  case class WithoutExtras[C](c: C)

  implicit def weW[C: OFormat]: Writes[WithoutExtras[C]] = (o: WithoutExtras[C]) =>
    Json.toJson(o.c)

  implicit def weR[C: OFormat]: Reads[WithoutExtras[C]] = (jsValue: JsValue) =>
    implicitly[Reads[C]].reads(jsValue).flatMap { c =>
      val backToJsValue: JsValue = Json.toJsObject(c)
      if (sameStructure(backToJsValue, jsValue))
        JsSuccess(WithoutExtras(c))
      else JsError(s"extra fields, $backToJsValue == $jsValue")
    }

}
