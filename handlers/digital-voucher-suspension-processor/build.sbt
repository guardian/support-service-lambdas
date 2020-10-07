import Dependencies.assemblyMergeStrategyDiscardModuleInfo

name := "digital-voucher-suspension-processor"
description := "Processor that suspends digital vouchers via the digital voucher API."

assemblyJarName := s"${name.value}.jar"
assemblyMergeStrategyDiscardModuleInfo

riffRaffPackageType := assembly.value
riffRaffUploadArtifactBucket := Option("riffraff-artifact")
riffRaffUploadManifestBucket := Option("riffraff-builds")
riffRaffManifestProjectName := s"MemSub::Membership Admin::${name.value}"
riffRaffArtifactResources += (file(s"handlers/${name.value}/cfn.yaml"), "cfn/cfn.yaml")
