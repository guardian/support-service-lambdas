import scala.collection.mutable.ArrayBuffer
var nums : ArrayBuffer[Int] = ArrayBuffer(1, 2, 3, 4, 5)
var num : Int = nums(0)

num += 6

println(num)
println(nums)