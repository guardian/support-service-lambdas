package com.gu.newproduct

import scala.io.Source
import scala.util.{Failure, Success, Try}

trait ResourceLoader {

  protected def getResource(name: String): Try[String] = {
    for {
      resourceUrl <- Option(getClass.getResource(name)) match {
        case Some(value) => Success(value)
        case None => Failure(new Throwable("resource not found"))
      }
      resourceData <- {
        val source = Source.fromURL(resourceUrl)
        val maybeData = Try(source.getLines().mkString("\n"))
        source.close
        maybeData
      }
    } yield resourceData
  }

}
