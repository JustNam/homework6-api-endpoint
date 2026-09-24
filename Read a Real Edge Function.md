const corsHeaders = { // HTTP header controls whether a page on one origin can call another origin
  'Access-Control-Allow-Origin': '*', // allow request access all origin
  'Access-Control-Allow-Headers': 'authorization, content-type', //alow request access on specific type of headers
}
 
Deno.serve(async (req) => {           //request async
  if (req.method === 'OPTIONS') {     //send request OPTIONS, if database response ok, then proceed
    return new Response('ok', { headers: corsHeaders })
  }
 
  if (req.method !== 'PATCH') {       //if request method is not PATCH -> return headers '405 Method not allowed'
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }
 
  const url = new URL(req.url)       // declare url value
  const id = url.searchParams.get('id') // get id from URL request


  if (!id) {                        // if request unidentified id (input) -> return headers '400 Missing id'
    return new Response('Missing id', { status: 400, headers: corsHeaders })
  }
 
  const body = await req.json()     //wait for req.json() finished run, then read body data which was sent from supabase
 
  const { error } = await supabase //destructuring syntax, breakdown parameter array into many individual argument, and then based on what assigned argument to return variable
    .from('interviews')            //define the location of data request (from table interview)
    .update({ status: body.status }) //define the method (update the body status)
    .eq('id', id)                     //condition: only update body status that have id same as url id (line 15-16)
 
  if (error) {                      //if arugment is 'error' -> headers '500 error message'
    return new Response(error.message, { status: 500, headers: corsHeaders })
  }
 
  return new Response(JSON.stringify({ success: true }), { //if argument is not 'error' -> return headers '200 ....'
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})

1. What method does it accept?
   PATCH
2. What does the request expect (params, body)?
   params: lấy 'id' từ URL  (sau khi searchParams)
   body:  object JSON - hiển thị response status theo reqquest
3. What does it return on success?
   status 200
   headers: {... corsHeaders, 'Content-Type': ' application/ json' },
4. What HTTP error would fire if a required input is missing?
   error message 400 - Missing id

> Phần lớn đúng rồi nha em, có 1 điểm nâng cao thêm cho tương lai.
> Tên bài là `PATCH /interviews/:id` - tức id nằm trên path - nhưng code thật lại đọc `url.searchParams.get('id')`, nghĩa là id đang nằm ở query string (`?id=...`) chứ không phải path param thật. Title với cách implement đang lệch nhau á em.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
}
 
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
 
  if (req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }
 
  const url = new URL(req.url)
  const id = url.searchParams.get('id')
 
  if (!id) {
    return new Response('Missing id', { status: 400, headers: corsHeaders })
  }
 
  const { data, error } = await supabase
    .from('research_questions')
    .select(`
      id,
      content,
      interview_questions (
        id,
        content
      )
    `)
    .eq('id', id)
    .single()
 
  if (error) {
    return new Response(error.message, { status: 500, headers: corsHeaders })
  }
 
  if (!data) {
    return new Response('Not found', { status: 404, headers: corsHeaders })
  }
 
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})

1. What method does it accept?
   GET
2. What does the request expect (params, body)?
   params: lấy 'id' từ URL  (sau khi searchParams)
3. What does it return on success?
   status 200
   headers: {... corsHeaders, 'Content-Type': ' application/ json' },
4. What HTTP error would fire if a required input is missing?
   error message 400 - Missing id
   error message 404 - Missing data

> Phần lớn đúng rồi nha em, có 1 điểm nâng cao thêm cho tương lai.
> Case "id không tồn tại" thực ra sẽ trả về 500 chứ không phải 404 đâu - vì `.single()` throw error ngay khi không match row nào, nên code rơi vào nhánh `if (error)` trước, không bao giờ chạy tới `if (!data)` được.