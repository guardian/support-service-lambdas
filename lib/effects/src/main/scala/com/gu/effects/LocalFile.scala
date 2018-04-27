package com.gu.effects

import java.io.{File, FileWriter}
import scala.util.Try

object LocalFile {

  def create(input: String, pathName: String): Try[File] = for {
    file <- Try(new File(pathName)) //Must use /tmp when running in a lambda
    writer <- Try(new FileWriter(file))
    _ <- Try(writer.write(input))
    _ <- Try(writer.close())
  } yield file

}
