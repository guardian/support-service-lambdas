package com.gu.contact_us_api

//import com.gu.contact_us_api.models.SFErrorDetails
//import io.circe.parser._
//import io.circe.generic.auto._
//import io.circe.syntax._

//object contactUsApp {
//  def main(args: Array[String]): Unit = {
//    val json: String =
//      """
//      {
//        "topic": "billing",
//        "subtopic": "s2",
//        "subsubtopic": "ss4",
//        "name": "Manuel Joaquim",
//        "email": "manuel.joaquim@email.com",
//        "subject": "Extra charges",
//        "message": "EXTRA CHARGES OMGWTFBBQ!!1",
//        "attachment": {
//          "name": "printscreen.jpeg",
//          "contents": "junkfornow"
//        }
//      }
//    """
//
//    val contactUsReqHandler = new ContactUs(new SalesforceConnector())
//
//    println(contactUsReqHandler.processReq(json).asJson)
//  }
//}
