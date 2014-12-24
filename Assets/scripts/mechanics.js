#pragma strict




// flight model
public var flightModelSimple : boolean = false;


/**
helicopter specs
force = mass * acceleration
**/
private var enginePower  : float =  9.81 * 1000;         // just enough to hover
private var engineTorque : float =  180 * Mathf.Deg2Rad; // deg/sec to turn around


// swashplate (cyclic control)
private var swashplateFront : Transform;
private var swashplateBack  : Transform;
private var swashplateLeft  : Transform;
private var swashplateRight : Transform;


// swashplate collective (added factor)
private var swashplateCollective    : float =  0;
private var swashplateCollectiveMin : float = -2;
private var swashplateCollectiveMax : float =  2;


// swashplate cyclic (added factor)
private var swashplateCyclicMax : float = 1;


// helo object
private var helo : Transform;


// rotor object
private var rotor : Transform;


// user control
private var heloControl : flightControl;


// helo flight data
private var heloFlightData : flightData;




/******************************************************************************/
function Start() {

   // user control
   heloControl = transform.GetComponent(flightControl);

   // helo flight data
   heloFlightData = transform.GetComponent(flightData);

   // helo is self
   helo = transform;

   // rotor
   rotor = transform.Find("rotor");

   // swashplate
   swashplateFront = transform.Find("rotor/swashplateFront");
   swashplateBack  = transform.Find("rotor/swashplateBack");
   swashplateLeft  = transform.Find("rotor/swashplateLeft");
   swashplateRight = transform.Find("rotor/swashplateRight");
}




/******************************************************************************/
function FixedUpdate() {


   /**
   switch flight model
   **/
   if(Input.GetKeyDown("f")) {
      flightModelSimple = !flightModelSimple;
   }


   /**
   init swashplate points
   these are factors
   they are affected by collective control and cyclic control
   **/
   var swashplatePowerFront : float = 1;
   var swashplatePowerBack  : float = 1;
   var swashplatePowerRight : float = 1;
   var swashplatePowerLeft  : float = 1;




   /**
   collective control
   this raises/lowers the swashplate evenly
   **/
   // collective up, raise swashplate
   if(heloControl.controlCollective > 0) {

      swashplateCollective = Mathf.Clamp(
         swashplateCollective + Time.deltaTime,
         swashplateCollectiveMin,
         swashplateCollectiveMax
      );
   }

   // collective down, lower swashplate
   else if(heloControl.controlCollective < 0) {

      swashplateCollective = Mathf.Clamp(
         swashplateCollective - Time.deltaTime,
         swashplateCollectiveMin,
         swashplateCollectiveMax
      );
   }

   // idle, lower swashplate
   else if(swashplateCollective > 0) {

      swashplateCollective = Mathf.Clamp(
         swashplateCollective - Time.deltaTime,
         0,
         swashplateCollectiveMax
      );
   }

   // idle, raise swashplate
   else if(swashplateCollective < 0) {

      swashplateCollective = Mathf.Clamp(
         swashplateCollective + Time.deltaTime,
         swashplateCollectiveMin,
         0
      );
   }

   // add collective swashplate power
   swashplatePowerFront += swashplateCollective;
   swashplatePowerBack  += swashplateCollective;
   swashplatePowerRight += swashplateCollective;
   swashplatePowerLeft  += swashplateCollective;




   /**
   yaw control
   this is simplified
   we can pretend to use the rotor's torque
   **/
   helo.rigidbody.AddRelativeTorque(Vector3(
      0.0,
      engineTorque * heloControl.controlYaw,
      0.0
   ), ForceMode.Acceleration);




   /**
   cyclic control
   **/
   //var controlPitch = heloControl.controlPitch * Mathf.Abs(heloControl.controlPitch);
   //var controlRoll  = heloControl.controlRoll  * Mathf.Abs(heloControl.controlRoll);

   //print(Time.deltaTime+"   "+heloControl.controlPitch+"   "+heloControl.controlRoll);



   /**
   control model, simple
   mouse rotates the helo body
   **/
   if(flightModelSimple) {

      helo.Rotate(Vector3(
         heloControl.controlPitch * -2,
         0.0,
         heloControl.controlRoll * -2
      ));
   }




   /**
   control model, advanced
   swashplate emulation
   raises/lowers swashplate points depending on input
   inputs are squared for finer control
   needs stabilization
   **/
   else {


      /**
      swashplate
      **/
      print(heloControl.controlPitch+"   "+heloControl.controlRoll);


      //var controlPitch = Mathf.Clamp(controlPitch + inputPitch, -1, 1);
      //var controlRoll  = Mathf.Clamp(controlRoll  + inputRoll,  -1, 1);


//print(heloControl.controlPitch+"   "+heloControl.controlRoll);


/*

      // exposed, square
      //controlPitch *= Mathf.Abs(controlPitch);
      //controlRoll  *= Mathf.Abs(controlRoll);

      var controlPitch = heloControl.controlPitch * Mathf.Abs(heloControl.controlPitch);
      var controlRoll  = heloControl.controlRoll  * Mathf.Abs(heloControl.controlRoll);


      // pitch
      swashplatePowerFront += swashplateCyclicMax * controlPitch;
      swashplatePowerBack  += swashplateCyclicMax * controlPitch * -1;


      // roll
      swashplatePowerLeft  += swashplateCyclicMax * controlRoll;
      swashplatePowerRight += swashplateCyclicMax * controlRoll * -1;
*/



      /**
      stabilizer
      this makes the cyclic input target a specific angle of attack (pitch/roll)
      then returns the swashplate to neutral position to maintain the angle
      0.01 unit of cyclic input is 1 degree
      affected range is -0.9/0.9 of the cyclic stick
      **/


      // default stabilizer values, 0.01 per degree
      var stabilizerPitch : float = heloFlightData.pitch / -100;
      var stabilizerRoll  : float = heloFlightData.roll  / -100;


      // stabilizer effect range
      var stabilizerRangeMin : float = -0.9;
      var stabilizerRangeMax : float =  0.9;


      var stabilizerDir    : float = 0;
      var stabilizerDiff   : float = 0;
      var stabilizerTorque : float = 0;
      var stabilizerTime   : float = 0;
      var tmp              : float = 0;


      // stabilize pitch
      if(heloControl.controlPitch >= stabilizerRangeMin && heloControl.controlPitch <= stabilizerRangeMax) {

         // pitch direction, -1 is forward, 1 is backward
         stabilizerDir = heloControl.controlPitch != 0
            ? heloControl.controlPitch / Mathf.Abs(heloControl.controlPitch)
            : 0;

         // difference between desired AOA (from cyclic input) and actual AOA
         // positive difference means we have not yet reach target AOA
         // negative difference means we have gone too far
         stabilizerDiff = (heloControl.controlPitch - heloFlightData.pitch / 100) * stabilizerDir;

         // torque speed in current direction in deg/sec
         stabilizerTorque = heloFlightData.speedPitch * stabilizerDir * -1 * Mathf.Rad2Deg;

         // time to reach target AOA at current torque
         stabilizerTime = stabilizerTorque != 0
            ? stabilizerDiff/stabilizerTorque
            : 0;


         tmp = (heloControl.controlPitch + stabilizerPitch) * stabilizerDir;
         if(tmp < 0) {
            //stabilizerPitch = heloControl.controlPitch * -1;
         }



         /*
            hmm, factor stuff relative to distance to target and static range
            lets say 30 deg max
            full force at zero, thats the default
            OR
            we use torque ETA to predict when to cancel torque
            our torque force is at 1.25m from center max force 1 * 1000 * 9.81
            thats cyclic factor + base force

            m/s / r  = rad/s

            0.5 * 1.25 = m/s
            0.625 m/s

            max angular accel
            enginePower * swashplateCyclicMax / mass / 1.25
            (9.81 * 1000) * 1 / 1000 / 1.25
            9.81 / 1.25 = 7.848 rad/s

            knowing our current ang spd and how much time before reaching target aoa
            we should produce a counter force that makes final speed fall within expected margins


         */

         //0.03



         //print(stabilizerDiff);




         // slow down torque when close to target AOA



/*
         //MEEEEEEEEEH
         // the more we go over the target AOA the stronger we push back
         if(stabilizerDiff < 0) {

            stabilizerPitch = stabilizerTorque / 10;
            stabilizerPitch *= stabilizerPitch;
            stabilizerPitch *= stabilizerDir * -1;

            print(stabilizerTorque+"   "+stabilizerPitch);
         }
*/
      }


      // stabilize roll
      if(heloControl.controlRoll >= stabilizerRangeMin && heloControl.controlRoll <= stabilizerRangeMax) {

         // pitch direction, -1 is forward, 1 is backward
         stabilizerDir = heloControl.controlRoll != 0
            ? heloControl.controlRoll / Mathf.Abs(heloControl.controlRoll)
            : 0;

         // difference between desired AOA (from cyclic input) and actual AOA
         // positive difference means we have not yet reach target AOA
         // negative difference means we have gone too far
         stabilizerDiff = (heloControl.controlRoll - heloFlightData.roll / 100) * stabilizerDir;

         // torque speed in current direction in deg/sec
         stabilizerTorque = heloFlightData.speedRoll * stabilizerDir * -1 * Mathf.Rad2Deg;

         // time to reach target AOA at current torque
         stabilizerTime = stabilizerTorque != 0
            ? stabilizerDiff/stabilizerTorque
            : 0;


         tmp = (heloControl.controlRoll + stabilizerRoll) * stabilizerDir;
         if(tmp < 0) {
            //stabilizerRoll = heloControl.controlRoll * -1;
         }




//MEEEEEEEEEH
         // the more we go over the target AOA the stronger we push back
         if(stabilizerDiff < 0) {
            //stabilizerRoll += stabilizerTorque * -0.05 * stabilizerDir;
         }
      }


      // clamp stabilizer
      stabilizerPitch = Mathf.Clamp(
         stabilizerPitch,
         swashplateCollectiveMin,
         swashplateCollectiveMax
      );
      stabilizerRoll = Mathf.Clamp(
         stabilizerRoll,
         swashplateCollectiveMin,
         swashplateCollectiveMax
      );


      // square correction to match cyclic input
      stabilizerPitch *= Mathf.Abs(stabilizerPitch);
      stabilizerRoll  *= Mathf.Abs(stabilizerRoll);


      // apply stabilizer correction, pitch
      swashplatePowerFront += swashplateCyclicMax * stabilizerPitch;
      swashplatePowerBack  += swashplateCyclicMax * stabilizerPitch * -1;


      // apply stabilizer correction, roll
      swashplatePowerLeft  += swashplateCyclicMax * stabilizerRoll;
      swashplatePowerRight += swashplateCyclicMax * stabilizerRoll * -1;
   }




/*
Retreating blade stall

Helicopters are inherently asymetric flying machines. In forward flight, there
will at any moment in time be one blade moving in the direction of flight
(called the advancing blade) and one moving opposite to the direction of flight
(called the retreating blade).

As the helicopter accellerates, the advancing blade's airspeed in its relative
wind increases; conversely, the airspeed of the retreating blade decreases. As
the helicopter goes faster, various parts of the retreating blade may stall and
no longer generate lift. When this happens, the aircraft nose will rise (as the
effect of the lack of lift takes place 90 degress later in the blade's cycle),
possibly violently.
*/




   /**
   lift power
   here we calculate how much lift we have
   **/


   // base lift power
   var liftPower : float = enginePower;





   /**
   ground effect (cushion)
   + 0% at 1 rotor height
   +20% at 0 rotor height
      TODO: apply to all surfaces, not just ground, given sufficient area
   **/
   var cushionFactor : float = 1 - heloFlightData.altitude / 3;
   cushionFactor = Mathf.Clamp(cushionFactor, 0, 1);
   cushionFactor *= cushionFactor; // square
   liftPower *= 1 + cushionFactor * 0.20;




   /**
   effective translational lift
   +10% lift at 20m/s and beyond (horizontal speed)
   **/
   var etlPowerFactor : float = heloFlightData.speedHorizontal / 20;
   etlPowerFactor = Mathf.Clamp(etlPowerFactor, 0, 1);
   etlPowerFactor *= etlPowerFactor; // square
   liftPower *= 1 + etlPowerFactor * 0.1;




   /**
   apply lift force and swashplate action
   **/
   helo.rigidbody.AddForceAtPosition(
      swashplateFront.up * liftPower/4 * swashplatePowerFront,
      swashplateFront.position,
      ForceMode.Force
   );
   helo.rigidbody.AddForceAtPosition(
      swashplateBack.up * liftPower/4 * swashplatePowerBack,
      swashplateBack.position,
      ForceMode.Force
   );
   helo.rigidbody.AddForceAtPosition(
      swashplateLeft.up * liftPower/4 * swashplatePowerLeft,
      swashplateLeft.position,
      ForceMode.Force
   );
   helo.rigidbody.AddForceAtPosition(
      swashplateRight.up * liftPower/4 * swashplatePowerRight,
      swashplateRight.position,
      ForceMode.Force
   );




/*
   print(""
      +" F: "+swashplatePowerFront
      +" B: "+swashplatePowerBack
      +" L: "+swashplatePowerLeft
      +" R: "+swashplatePowerRight
   );
*/
}