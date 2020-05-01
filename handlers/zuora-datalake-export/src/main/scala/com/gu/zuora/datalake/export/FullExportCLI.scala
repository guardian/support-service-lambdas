package com.gu.zuora.datalake.`export`

import scala.io.StdIn

object FullExportCLI {

  val validStageValues = List("CODE", "PROD")

  def main(args: Array[String]): Unit = {

    val stage = System.getenv("Stage")

    val maybeExistingJobId: Option[String] = Option(
      StdIn.readLine("If you have an existing Job ID you simply enter it now... (otherwise just leave it blank)\n")
    ).filter(_.trim.nonEmpty)

    val stageConfirmationMsg =
      s"Are you sure you want to perform ${maybeExistingJobId.getOrElse("queries and later")} uploads in $stage? (Yes or No)\n"

    if (validStageValues.contains(stage) && StdIn.readLine(stageConfirmationMsg).toLowerCase == "yes") {

      ExportLambda.handle(InputData("afterLastIncrement", maybeExistingJobId), context = null)

    } else {

      println(s"You must set the 'Stage' environment variable to one of [ ${validStageValues.mkString(" | ")} ]")

    }

  }

}
