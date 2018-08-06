package com.gu.fudgetests

import sbt.testing.Runner

class UnitTestsRunner extends org.scalatest.tools.Framework {

    // this is needed because
  override def runner(args: Array[String], remoteArgs: Array[String], testClassLoader: ClassLoader): Runner = {
    val skipArgs = Array[String]("-l", "com.gu.test.EffectsTest", "-l", "com.gu.test.HealthCheck")
    super.runner(skipArgs ++ args, Array[String](), testClassLoader)
  }

}
