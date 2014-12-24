#pragma strict




/******************************************************************************/
function Start () {

   // generate some random buildings
   var x : int;
   var z : int;

   for(x=-200; x<200; x+=20) {
      for(z=-50; z<350; z+=20) {

         var height : int = Random.Range(2,40);

         var prefabBuilding = GameObject.CreatePrimitive(PrimitiveType.Cube);
         prefabBuilding.transform.position = Vector3(
            x + Random.Range(-4,4),
            0+height/2,
            z + Random.Range(-4,4)
         );

         prefabBuilding.transform.localScale += Vector3(
            Random.Range(4,8),
            height,
            Random.Range(4,8)
         );

         prefabBuilding.transform.localRotation.eulerAngles.y = Random.Range(0,90);
      }
   }



/**
   // generate wall of cubes
   var y : int;
   for(x=-45; x<45; x+=1) {
      for(y=-45; y<45; y+=1) {

         var c = GameObject.CreatePrimitive(PrimitiveType.Cube);

         c.transform.Translate(Vector3(0,0,20));
         c.transform.Translate(Vector3(x,45+y));

         c.transform.localScale = Vector3(0.5, 0.5, 0.5);
      }
   }

/**/

}