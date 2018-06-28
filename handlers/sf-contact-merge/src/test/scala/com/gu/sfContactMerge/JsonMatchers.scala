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

  // *** //

  case class JsEmbeddded[C](c: C, origIgnoredInComparison: Option[String] = None) {
    override def equals(obj: scala.Any): Boolean = obj match {
      case JsEmbeddded(objc, _) => c.equals(objc)
      case _ => false
    }

    override def hashCode(): Int = c.hashCode

    override def toString: String = s"JsEmbeddded(${c.toString})"
  }

  implicit def eW[C: OFormat]: Writes[JsEmbeddded[C]] = (o: JsEmbeddded[C]) =>
    JsString(o.origIgnoredInComparison.getOrElse(s"missing orig (salt ${scala.util.Random.nextInt})"))

  implicit def eR[C: OFormat]: Reads[JsEmbeddded[C]] = (jsValue: JsValue) =>
    JsPath.read[String].reads(jsValue).flatMap { stringContainingEmbeddedJson =>
      val jsValue = Json.parse(stringContainingEmbeddedJson)
      val maybeC = jsValue.validate[C]
      val withExtrasCheck = maybeC.flatMap { c =>
        val backToJsValue: JsValue = Json.toJsObject(c)
        if (backToJsValue == jsValue)
          JsSuccess(c)
        else JsError("extra fields")
      }
      withExtrasCheck.map(c => JsEmbeddded(c, Some(stringContainingEmbeddedJson)))
    }

  case class WithoutExtras[C](c: C)

  implicit def weW[C: OFormat]: Writes[WithoutExtras[C]] = (o: WithoutExtras[C]) =>
    Json.toJson(o.c)

  implicit def weR[C: OFormat]: Reads[WithoutExtras[C]] = (jsValue: JsValue) =>
    implicitly[Reads[C]].reads(jsValue).flatMap { c =>
      val backToJsValue: JsValue = Json.toJsObject(c)
      if (backToJsValue == jsValue)
        JsSuccess(WithoutExtras(c))
      else JsError("extra fields")
    }

}
