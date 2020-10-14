//import Dependencies._
//
//// "Any .sbt files in foo, say foo/build.sbt, will be merged with the build definition for the entire build, but scoped to the hello-foo project."
//// https://www.scala-sbt.org/0.13/docs/Multi-Project.html
//name :=
//description:=
//
//assemblyJarName := "catalog-service.jar"
//riffRaffPackageType := assembly.value
//riffRaffUploadArtifactBucket := Option("riffraff-artifact")
//riffRaffUploadManifestBucket := Option("riffraff-builds")
//riffRaffManifestProjectName :=
//riffRaffArtifactResources += (file("handlers/catalog-service/cfn.yaml"), "cfn/cfn.yaml")
//
//libraryDependencies ++= Seq(
//)
//
//resolvers ++= Seq(
//  Resolver.sonatypeRepo("releases")
//)
//
//assemblyMergeStrategyDiscardModuleInfo