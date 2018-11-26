package com.gu.util.apigateway

import play.api.libs.json._

import scala.util.Try

object test extends App{

  case class WireSomething(bla:String)

  //this returns success with a jsError inside
//  object WireSomething{
//    implicit val wireSomethingReader = Json.reads[WireSomething]
//  }
  //this throws an exception when parsing valid json but in the incorrect format
  object WireSomething{
    implicit val wiresomethingReader = new Reads[WireSomething] {
      override def reads(json: JsValue) = JsSuccess(WireSomething(
        bla = (json \ "bla").as[String],
      ))
    }
  }

val bodyString =
  """
    |{
    |"bla1" : "someValue"
    |}
  """.stripMargin


    val someREsult =  Try(Json.parse(bodyString)).map { js =>
      Json.fromJson[WireSomething](js)
    }



  println(someREsult)
}
