package com.gu.effects

import java.io.{File, FileWriter}
import scala.util.Try

case class FileConstructor(input: String, filePath: String)

object LocalFile {

  def create(fileConstructor: FileConstructor): Try[File] = for {
    file <- Try(new File(fileConstructor.filePath))
    writer <- Try(new FileWriter(file))
    _ <- Try(writer.write(fileConstructor.input))
    _ <- Try(writer.close())
  } yield file

}
