version := "0.1"

scalaVersion := "2.13.3"

libraryDependencies += "org.scalaj" %% "scalaj-http" % "2.4.2"
val circeVersion = "0.12.3"

libraryDependencies ++= Seq(
  "io.circe" %% "circe-core",
  "io.circe" %% "circe-generic",
  "io.circe" %% "circe-parser"
).map(_ % circeVersion)
