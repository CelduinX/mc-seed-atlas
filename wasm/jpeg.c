#include <stdio.h>
#include <stdlib.h>
#include <setjmp.h>
#include <jpeglib.h>
#include <emscripten.h>

static struct jpeg_compress_struct compressor;
static struct jpeg_error_mgr errors;
static struct jpeg_destination_mgr destination;
static jmp_buf escape;
static unsigned char output[65536];
static unsigned char *row;
static int active;
EM_JS(void, emit_chunk, (unsigned char *data, int size), {
    if (Module.onJpegChunk) Module.onJpegChunk(HEAPU8.slice(data, data + size));
});
static void fail(j_common_ptr c) { longjmp(escape, 1); }
static void start_destination(j_compress_ptr c) {
    destination.next_output_byte = output; destination.free_in_buffer = sizeof(output);
}
static boolean flush_destination(j_compress_ptr c) {
    emit_chunk(output, sizeof(output)); start_destination(c); return TRUE;
}
static void end_destination(j_compress_ptr c) {
    emit_chunk(output, sizeof(output) - destination.free_in_buffer);
}
void atlas_jpeg_abort(void) {
    if (active) jpeg_destroy_compress(&compressor);
    active = 0; free(row); row = NULL;
}
unsigned char *atlas_jpeg_begin(int width, int height) {
    atlas_jpeg_abort();
    if (width < 1 || height < 1 || width > 20002 || height > 20002) return NULL;
    compressor.err = jpeg_std_error(&errors); errors.error_exit = fail;
    if (setjmp(escape)) { atlas_jpeg_abort(); return NULL; }
    jpeg_create_compress(&compressor); active = 1;
    destination.init_destination = start_destination;
    destination.empty_output_buffer = flush_destination;
    destination.term_destination = end_destination;
    compressor.dest = &destination;
    compressor.image_width = width; compressor.image_height = height;
    compressor.input_components = 3; compressor.in_color_space = JCS_RGB;
    jpeg_set_defaults(&compressor);
    /* Quality 90, no chroma subsampling: compact files with sharp boundaries. */
    compressor.comp_info[0].h_samp_factor = compressor.comp_info[0].v_samp_factor = 1;
    jpeg_set_quality(&compressor, 90, TRUE);
    row = malloc((size_t)width * 3);
    if (!row) { atlas_jpeg_abort(); return NULL; }
    jpeg_start_compress(&compressor, TRUE); return row;
}
int atlas_jpeg_row(void) {
    if (!active) return -1;
    if (setjmp(escape)) { atlas_jpeg_abort(); return -1; }
    JSAMPROW rows[1] = {row};
    return jpeg_write_scanlines(&compressor, rows, 1) == 1 ? 0 : -1;
}
int atlas_jpeg_finish(void) {
    if (!active) return -1;
    if (setjmp(escape)) { atlas_jpeg_abort(); return -1; }
    jpeg_finish_compress(&compressor); atlas_jpeg_abort(); return 0;
}
