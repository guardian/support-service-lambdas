//package com.gu.newproduct.api.addsubscription.zuora
//
//object main extends App {
//
//  case class lazything[A](value: () => A)
//
//  lazy val message = getMessage("john")
//
//  object lazything {
//    def apply[A](a: => A) = new lazything[A](() => a)
//  }
//
//  val a = lazything {
//    getMessage("john")
//  }
//
//  def getMessage(name: String): Option[String] = {
//    println("executing getMessage")
//    Some(s"hello $name")
//  }
//
//  def concat(
//    somethingElse: Option[String],
//    message: => Option[String]
//  ) = {
//    for {
//      a <- somethingElse
//      b <- message
//    } yield (s"$a $b")
//  }
//
//  val res = concat(Some("something"), message)
//  println(s"res was $res")
//}
